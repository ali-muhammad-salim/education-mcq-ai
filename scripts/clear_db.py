import psycopg2, os
from dotenv import load_dotenv
load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute('TRUNCATE TABLE "Board" CASCADE;')
conn.commit()
print('Cleared DB')
