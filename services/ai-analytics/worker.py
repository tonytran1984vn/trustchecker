"""
Redis Queue Worker for AI Analytics Service
"""

import json
import os
import time
import redis

from engines import carbon, scm_ai, demand_sensing

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QUEUES = ["queue:analytics", "queue:carbon"]

HANDLERS = {
    "carbon-footprint": lambda d: carbon.calculate_footprint(d.get("product", {}), d.get("shipments", []), d.get("events", [])),
    "carbon-aggregate": lambda d: carbon.aggregate_by_scope(d.get("products", []), d.get("shipments", []), d.get("events", [])),
    "carbon-leaderboard": lambda d: carbon.partner_leaderboard(d.get("partners", []), d.get("shipments", []), d.get("violations", [])),
    "carbon-gri": lambda d: carbon.generate_gri_report(d),
    "scm-predict-delay": lambda d: scm_ai.predict_delay(d.get("shipments", [])),
    "scm-forecast-inventory": lambda d: scm_ai.forecast_inventory(d.get("history", []), d.get("periods_ahead", 7)),
    "scm-bottlenecks": lambda d: scm_ai.detect_bottlenecks(d.get("events", []), d.get("partners", [])),
    "scm-optimize-route": lambda d: scm_ai.optimize_route(d.get("graph", []), d.get("from_id", ""), d.get("to_id", "")),
    "scm-partner-risk": lambda d: scm_ai.score_partner_risk(d.get("partner", {}), d.get("alerts", []), d.get("shipments", []), d.get("violations", [])),
    "scm-pagerank": lambda d: scm_ai.page_rank(d.get("nodes", []), d.get("edges", []), d.get("iterations", 20), d.get("damping", 0.85)),
    "scm-toxic-nodes": lambda d: scm_ai.detect_toxic_nodes(d.get("nodes", []), d.get("edges", []), d.get("alerts", [])),
    "demand-sensing": lambda d: demand_sensing.detect(d.get("sales_history", []), d.get("threshold", 2.0)),
}


def main():
    print(f"🚀 AI Analytics Worker connecting to {REDIS_URL}")
    r = redis.from_url(REDIS_URL, decode_responses=True)

    while True:
        try:
            # blpop: blocks until a job is available — zero CPU when idle, instant wake
            result = r.blpop(QUEUES, timeout=5)
            if not result:
                continue  # Timeout — loop back to retry

            _queue_name, job_raw = result
            job = json.loads(job_raw)
            name = job.get("name", "unknown")
            data = job.get("data", {})
            job_id = job.get("id", "?")

            print(f"📋 Processing job {job_id}: {name}")
            t0 = time.time()

            handler = HANDLERS.get(name)
            if handler:
                result = handler(data)
                elapsed = round((time.time() - t0) * 1000)
                print(f"✅ Job {job_id} completed in {elapsed}ms")
                r.setex(f"result:{job_id}", 3600, json.dumps(result, default=str))
            else:
                print(f"⚠️ Unknown job type: {name}")

        except Exception as e:
            print(f"❌ Worker error: {e}")
            time.sleep(1)  # Back off on error


if __name__ == "__main__":
    main()
