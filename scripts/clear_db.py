"""Retired unsafe legacy command; retained to explain old invocations.

Historical implementation remains recoverable from Git. Production source
processing belongs to the durable AI worker and educator review queue.
"""
import sys


def main():
    print("This legacy command is retired because it could delete existing content or publish unreviewed AI output. Use administrator source ingestion and review. No database or files were changed.", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
