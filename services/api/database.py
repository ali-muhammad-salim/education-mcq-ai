import logging

logger = logging.getLogger(__name__)

class DummyModel:
    def find_many(self, **kwargs):
        return []
    def find_unique(self, **kwargs):
        return None

class DummyPrisma:
    def __init__(self):
        self.board = DummyModel()
        self.syllabusversion = DummyModel()
        self.slo = DummyModel()
        self.pastpaperquestion = DummyModel()
        self.bookcontent = DummyModel()
        self.topic = DummyModel()

    def is_connected(self):
        return False

    def connect(self, timeout=3):
        pass

    def disconnect(self):
        pass

prisma = DummyPrisma()

def connect_db():
    pass

def disconnect_db():
    pass


