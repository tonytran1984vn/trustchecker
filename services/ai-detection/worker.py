"""
Redis Queue Worker for AI Detection Service
"""

import json
import os
import time
import redis

from engines import fraud, anomaly, risk_radar

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QUEUES = ["queue:detection", "queue:anomaly"]

HANDLERS = {
    "fraud-analyze": lambda data: fraud.analyze(data.get("scan_event", {}), data.get("context", {})),
    "anomaly-full-scan": lambda data: anomaly.run_full_scan(data),
    "anomaly-velocity": lambda data: anomaly.detect_scan_velocity(data.get("scan_events", []), data.get("window_minutes", 60)),
    "anomaly-fraud-spikes": lambda data: anomaly.detect_fraud_spikes(data.get("fraud_alerts", [])),
    "anomaly-trust-drops": lambda data: anomaly.detect_trust_drops(data.get("trust_scores", [])),
    "anomaly-geo": lambda data: anomaly.detect_geo_dispersion(data.get("scan_events", []), data.get("window_hours", 1)),
    "risk-radar": lambda data: risk_radar.compute_radar(data),
    "risk-heatmap": lambda data: risk_radar.generate_heatmap(data.get("partners", []), data.get("shipments", []), data.get("leaks", [])),
}


def main():
    print(f"🚀 AI Detection Worker connecting to {REDIS_URL}")
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
                r.setex(f"result:{job_id}", 3600, json.dumps(result, default=str))
            else:
                print(f"⚠️ Unknown job type: {name}")

        except Exception as e:
            print(f"❌ Worker error: {e}")
            time.sleep(1)


if __name__ == "__main__":
    main()
