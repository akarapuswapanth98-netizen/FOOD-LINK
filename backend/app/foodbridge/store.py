"""In-memory FoodBridge store with demo seed data.

Demo geometry (Green Leaf Restaurant 17.4200/78.4800 -> shelters):
  shelter-a: ~2.1 km, demand 50 (cap 60 - occ 10), urgency high
  shelter-b: ~4.7 km, demand 30 (cap 40 - occ 10), urgency medium
  shelter-c: ~3.2 km, demand 70 (cap 80 - occ 10), urgency high
Lot food-001: 80 cooked_meals, dietary_tags=["vegetarian"], expires now+5h.
Allocation is computed by scoring.py - never hard-coded.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from app.foodbridge.models import FoodSurplus, Restaurant, Shelter


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class FoodBridgeStore:
    def __init__(self, seed: bool = True):
        self.restaurants: Dict[str, Restaurant] = {}
        self.surpluses: Dict[str, FoodSurplus] = {}
        self.shelters: Dict[str, Shelter] = {}
        self._reserved: set = set()  # lots with an in-flight match (must exist before reset())
        if seed:
            self.seed_demo()

    def seed_demo(self) -> None:
        restaurant = Restaurant(
            id="rest-001",
            name="Green Leaf Restaurant",
            lat=17.4200,
            lon=78.4800,
            address="12 Banjara Lane, Hyderabad",
            cuisine_types=["north-indian", "veg"],
            contact="+91-90000-11111",
        )
        self.restaurants[restaurant.id] = restaurant

        # Extended demo registry (added for multi-partner rescue board).
        # Matching for existing lots is untouched: the engine scores shelters
        # per-lot, so these additions cannot change the food-001 A:50/B:30
        # pinned regression.
        for extra in [
            Restaurant(
                id="rest-meghana", name="Meghana Foods",
                lat=17.4355, lon=78.4620,
                address="Road No. 12, Banjara Hills, Hyderabad",
                cuisine_types=["andhra", "biryani", "non-veg"],
                contact="+91-90000-22222",
            ),
            Restaurant(
                id="rest-truffles", name="Truffles",
                lat=17.4220, lon=78.4730,
                address="Begumpet, Hyderabad",
                cuisine_types=["burgers", "american"],
                contact="+91-90000-33333",
            ),
            Restaurant(
                id="rest-theobroma", name="Theobroma",
                lat=17.4100, lon=78.4900,
                address="Jubilee Hills, Hyderabad",
                cuisine_types=["bakery", "desserts"],
                contact="+91-90000-44444",
            ),
            Restaurant(
                id="rest-eatfit", name="EatFit",
                lat=17.4300, lon=78.4660,
                address="Madhapur, Hyderabad",
                cuisine_types=["healthy", "bowls", "protein"],
                contact="+91-90000-55555",
            ),
            Restaurant(
                id="rest-a2b", name="Adyar Ananda Bhavan",
                lat=17.4150, lon=78.4850,
                address="Dilsukhnagar, Hyderabad",
                cuisine_types=["south-indian", "meals", "tiffin"],
                contact="+91-90000-66666",
            ),
            Restaurant(
                id="rest-paradise", name="Paradise Biryani House",
                lat=17.4280, lon=78.4700,
                address="MG Road, Secunderabad",
                cuisine_types=["biryani", "hyderabadi", "non-veg"],
                contact="+91-90000-77777",
            ),
            Restaurant(
                id="rest-chutneys", name="Chutneys",
                lat=17.4180, lon=78.4760,
                address="Banjara Hills, Hyderabad",
                cuisine_types=["south-indian", "veg"],
                contact="+91-90000-88888",
            ),
            Restaurant(
                id="rest-pista", name="Pista House",
                lat=17.4120, lon=78.4880,
                address="Charminar Road, Hyderabad",
                cuisine_types=["bakery", "haleem", "desserts"],
                contact="+91-90000-99999",
            ),
            Restaurant(
                id="rest-subway", name="Subway Madhapur",
                lat=17.4330, lon=78.4600,
                address="100 Ft Road, Madhapur",
                cuisine_types=["healthy", "sandwich", "salads"],
                contact="+91-90000-10101",
            ),
            Restaurant(
                id="rest-dominos", name="Domino's Jubilee Hills",
                lat=17.4080, lon=78.4920,
                address="Road No. 36, Jubilee Hills",
                cuisine_types=["italian", "pizza", "veg"],
                contact="+91-90000-12121",
            ),
            Restaurant(
                id="rest-ohri", name="Ohri's Tansen",
                lat=17.4250, lon=78.4780,
                address="Begumpet, Hyderabad",
                cuisine_types=["north-indian", "tandoor", "veg"],
                contact="+91-90000-13131",
            ),
        ]:
            self.restaurants[extra.id] = extra

        now = utcnow()
        lot = FoodSurplus(
            id="food-001",
            restaurant_id=restaurant.id,
            meal_count=80,
            food_type="cooked_meals",
            dietary_tags=["vegetarian"],
            prepared_at=now - timedelta(hours=1),
            expires_at=now + timedelta(hours=5),
            temperature_c=5.0,
            notes="Fresh vegetarian lunch service surplus",
        )
        self.surpluses[lot.id] = lot

        # Extra live-board lots (older than food-001 so food-001 stays
        # latest_surplus() for pinned A:50/B:30 regression tests).
        extras = [
            ("food-002", "rest-meghana", 45, "veg_biryani", ["vegetarian"], 4.0, "Veg dum biryani trays"),
            ("food-003", "rest-truffles", 28, "veg_burger", ["vegetarian"], 3.0, "Paneer sliders"),
            ("food-004", "rest-theobroma", 20, "chocolate_pastry", ["vegetarian"], 6.0, "Pastry boxes"),
            ("food-005", "rest-eatfit", 35, "protein_bowl", ["vegetarian"], 2.0, "Protein bowls"),
            ("food-006", "rest-a2b", 60, "veg_thali", ["vegetarian"], 5.0, "South-indian meals"),
            ("food-007", "rest-paradise", 50, "chicken_biryani", [], 4.0, "Chicken biryani (non-veg demo)"),
            ("food-008", "rest-chutneys", 25, "veg_thali", ["vegetarian"], 1.5, "Mini meals - expiring soon"),
            ("food-009", "rest-pista", 18, "bakery", ["vegetarian"], 7.0, "Bakery assortment"),
        ]
        for i, (lid, rid, meals, ftype, tags, exp_h, notes) in enumerate(extras):
            self.surpluses[lid] = FoodSurplus(
                id=lid,
                restaurant_id=rid,
                meal_count=meals,
                food_type=ftype,
                dietary_tags=tags,
                prepared_at=now - timedelta(hours=2, minutes=i * 10),
                expires_at=now + timedelta(hours=exp_h),
                temperature_c=5.0,
                notes=notes,
            )

        self.shelters = {
            "shelter-a": Shelter(
                id="shelter-a",
                name="Shelter A - Govt. Higher Secondary School",
                lat=17.4390, lon=78.4800,
                capacity=60, current_occupancy=10,
                urgency="high", food_requirements=["vegetarian"],
                address="School Compound, North Colony",
            ),
            "shelter-b": Shelter(
                id="shelter-b",
                name="Shelter B - Community Hall",
                lat=17.3775, lon=78.4800,
                capacity=40, current_occupancy=10,
                urgency="medium", food_requirements=["vegetarian"],
                address="Old Market Road",
            ),
            "shelter-c": Shelter(
                id="shelter-c",
                name="Shelter C - Night Shelter Trust",
                lat=17.4200, lon=78.5101,
                capacity=80, current_occupancy=10,
                urgency="high", food_requirements=["vegetarian"],
                address="Trust Building, East Side",
            ),
        }

    # --- lookups ---------------------------------------------------------
    def get_restaurant(self, restaurant_id: str) -> Optional[Restaurant]:
        return self.restaurants.get(restaurant_id)

    def get_surplus(self, surplus_id: str) -> Optional[FoodSurplus]:
        return self.surpluses.get(surplus_id)

    def get_shelter(self, shelter_id: str) -> Optional[Shelter]:
        return self.shelters.get(shelter_id)

    def list_restaurants(self) -> List[Restaurant]:
        return list(self.restaurants.values())

    def list_surpluses(self, restaurant_id: Optional[str] = None) -> List[FoodSurplus]:
        lots = list(self.surpluses.values())
        if restaurant_id:
            lots = [l for l in lots if l.restaurant_id == restaurant_id]
        return sorted(lots, key=lambda l: l.prepared_at, reverse=True)

    def list_shelters(self) -> List[Shelter]:
        return list(self.shelters.values())

    def list_available_surpluses(self, restaurant_id: Optional[str] = None) -> List[FoodSurplus]:
        """Lots still matchable: status == "available" (order preserved)."""
        return [l for l in self.list_surpluses(restaurant_id) if l.status == "available"]

    def latest_surplus(self, restaurant_id: Optional[str] = None) -> Optional[FoodSurplus]:
        """Most recent lot that can still be matched (available only)."""
        lots = self.list_available_surpluses(restaurant_id)
        return lots[0] if lots else None

    # --- mutations -------------------------------------------------------
    def add_surplus(self, lot: FoodSurplus) -> FoodSurplus:
        self.surpluses[lot.id] = lot
        return lot

    # --- surplus lifecycle: consume-on-match -----------------------------
    def commit_allocation(self, surplus_id: str, total_allocated: int) -> Optional[FoodSurplus]:
        """Apply a completed match to its lot. Called exactly once per workflow
        from coordinator_final_node with the total verified by verification_node.

        full consumption -> status="allocated" (meal_count kept for audit)
        partial          -> meal_count -= total, status stays "available"
        zero/already allocated -> unchanged (idempotent guard)
        """
        lot = self.surpluses.get(surplus_id)
        if lot is None or lot.status != "available":
            return lot
        total = int(total_allocated or 0)
        if total <= 0:
            return lot
        if total >= lot.meal_count:
            lot.status = "allocated"
        else:
            lot.meal_count -= total
        return lot

    # --- concurrency guard: one in-flight match per lot -------------------
    def reserve_surplus(self, surplus_id: str) -> bool:
        """Claim a lot for an in-flight match; False if consumed or in-flight.

        This is a fully synchronous `def` with NO await (and no other yield
        point) between the status check and `set.add()`: on a single event loop
        a coroutine cannot be preempted between those two statements, so the
        check+claim is atomic. That is exactly what makes a plain set safe here
        instead of an asyncio.Lock (which would also risk cross-event-loop
        lock affinity under TestClient/portal event loops).
        """
        lot = self.surpluses.get(surplus_id)
        if lot is None or lot.status != "available" or surplus_id in self._reserved:
            return False
        self._reserved.add(surplus_id)
        return True

    def release_surplus(self, surplus_id: str) -> None:
        """Always called from a route's finally so a crash cannot leak a claim."""
        self._reserved.discard(surplus_id)

    def reset(self) -> None:
        """Restore pristine demo data (used by tests for isolation)."""
        self.restaurants.clear()
        self.surpluses.clear()
        self.shelters.clear()
        self._reserved.clear()
        self.seed_demo()


_store: Optional[FoodBridgeStore] = None


def get_store() -> FoodBridgeStore:
    global _store
    if _store is None:
        _store = FoodBridgeStore()
    return _store


def reset_store() -> None:
    get_store().reset()
