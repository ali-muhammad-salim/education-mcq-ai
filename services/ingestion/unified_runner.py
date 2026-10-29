"""Retired command: imports now run through the durable source-review worker."""
import sys


def main():
    print('Legacy direct-to-published ingestion is retired. Upload the source through the administrator ingestion endpoint; the dedicated AI worker stages evidence in the source review queue.', file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
