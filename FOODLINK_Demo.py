import sys
sys.path.insert(0, "backend")

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import get_settings
from app.foodbridge.store import get_store, reset_store
from app.foodbridge.events import get_event_store
from app.foodbridge.scoring import haversine_km, normalize_weights, score_all

reset_store()
get_event_store().clear()
client = TestClient(app)
s = get_settings()
print("env:", s.APP_ENV, "| llm:", s.LLM_PROVIDER, "/", s.LLM_MODEL)
print("health:", client.get("/api/health").json())

# %%
store = get_store()
print(f"restaurants: {len(store.list_restaurants())} | shelters: {len(store.list_shelters())} | lots: {len(store.list_surpluses())}")
for r in store.list_restaurants():
    print(f"  {r.id:15} {r.name:32} ({','.join(r.cuisine_types)})")
print()
for sh in store.list_shelters():
    demand = sh.capacity - sh.current_occupancy
    print(f"  {sh.id:12} demand={demand:3} urgency={sh.urgency:6} req={sh.food_requirements}")
print()
for lot in store.list_surpluses():
    print(f"  {lot.id:10} rest={lot.restaurant_id:15} meals={lot.meal_count:3} type={lot.food_type:18} tags={lot.dietary_tags} hrs_left={lot.hours_remaining():.1f}")

# %%
store = get_store()
rest = store.get_restaurant("rest-001").model_dump(mode="json")
lot = store.get_surplus("food-001").model_dump(mode="json")
shelters = [x.model_dump(mode="json") for x in store.list_shelters()]
w = normalize_weights(get_settings().matching_weights())
print("weights:", {k: round(v, 3) for k, v in w.items()}, "| sum =", round(sum(w.values()), 3))
ranked = score_all(rest, lot, shelters, w, hours_remaining=5.0)
for r in ranked:
    print(f"  {r['shelter_id']:12} score={r['score']:.3f} demand={r['demand']:3} dist={r['distance_km']:.2f}km")

# %%
reset_store()  # pristine lot: food-001 / 80 meals / available
r = client.post("/api/foodbridge/match", json={"surplus_id": "food-001", "requested_radius_km": 10})
assert r.status_code == 200, r.text
j = r.json()
print("success:", j["success"], "| status:", j["workflow_status"], "| retries:", j["retry_count"])
print("allocated:", j["total_allocated"], "| unallocated:", j["unallocated"])
for a in j["allocation"]:
    print(f"  {a['shelter_id']:12} {a['meals']:3} meals  {a['distance_km']:.2f}km  score={a['score']:.3f}")
print("summary:", j["summary"][:220])

# %%
agents = [e["agent"] for e in j["agent_events"]]
print("order:", agents)
assert agents == ["coordinator", "restaurant", "shelter", "matching", "logistics", "verification", "coordinator"]
for e in j["agent_events"]:
    print(f"  [{e['status']:9}] {e['agent']:12} {e['detail'][:90]}")

# %%
reset_store()
r1 = client.post("/api/foodbridge/match", json={"surplus_id": "food-001", "requested_radius_km": 2.5}).json()
print("tight-radius allocation:", [(a["shelter_id"], a["meals"]) for a in r1["allocation"]], "| unallocated:", r1["unallocated"])
lot = get_store().get_surplus("food-001")
print("lot after partial:", lot.status, lot.meal_count, "meals left")
visible = [x["id"] for x in client.get("/api/foodbridge/surplus").json()["surplus"]]
print("food-001 still listed (partial -> available):", "food-001" in visible)
client.post("/api/foodbridge/demo/reset")  # restore seed for the board
print("after reset:", [(x["id"], x["status"], x["meal_count"]) for x in client.get("/api/foodbridge/surplus").json()["surplus"]][:3], "...")