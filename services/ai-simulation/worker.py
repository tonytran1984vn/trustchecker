"""
Redis Queue Worker for AI Simulation Service
Consumes jobs from Redis queues and dispatches to engines.
"""

import json
import os
import time
import redis

from engines import monte_carlo, digital_twin, holt_winters, what_if

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QUEUES = ["queue:simulation", "queue:blockchain", "queue:trust-score"]

HANDLERS = {
    "monte-carlo": lambda data: monte_carlo.run(data.get("params", {}), data.get("simulations", 1000)),
    "digital-twin-build": lambda data: digital_twin.build_model(data),
    "digital-twin-kpis": lambda data: digital_twin.compute_kpis(data),
    "digital-twin-anomalies": lambda data: digital_twin.detect_anomalies(data),
    "digital-twin-simulate": lambda data: digital_twin.simulate_disruption(data.get("model", {}), data.get("scenario", {})),
    "holt-winters": lambda data: holt_winters.forecast(data.get("data", []), data.get("season_length", 7), data.get("periods_ahead", 14), data.get("params", {})),
    "what-if": lambda data: what_if.simulate(data.get("scenario", {}), data.get("current_state", {})),
}


def main():
    print(f"🚀 AI Simulation Worker connecting to {REDIS_URL}")
    r = redis.from_url(REDIS_URL, decode_responses=True)

    while True:
        try:
            # blpop: blocks until a job is available — zero CPU when idle, instant wake
            result = r.blpop(QUEUES, timeout=5)
            if not result:
                continue

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

                # Store result for retrieval
                r.setex(f"result:{job_id}", 3600, json.dumps(result, default=str))
            else:
                print(f"⚠️ Unknown job type: {name}")

        except Exception as e:
            print(f"❌ Worker error: {e}")
            time.sleep(1)


if __name__ == "__main__":
    main()
