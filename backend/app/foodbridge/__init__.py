"""FoodBridge - multi-agent surplus-food matching that runs autonomously in real time.

Specialized AI agents negotiate and hand off rescue tasks without human input:
coordinator assigns tasks, restaurant validates surplus, shelter finds nearby
shelters, matching negotiates the allocation, logistics hands off delivery tasks,
verification confirms the handoff.

6 agents: coordinator -> restaurant -> shelter -> matching -> logistics -> verification
(-> bounded retry into matching, or coordinator final/error).
Pure scoring lives in scoring.py; state in state.py; graph in workflow.py.
"""
from app.foodbridge.store import get_store, reset_store
from app.foodbridge.workflow import run_match_workflow, build_match_workflow

__all__ = ["get_store", "reset_store", "run_match_workflow", "build_match_workflow"]
