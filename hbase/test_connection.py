# test_connectivity.py
import happybase

HOST = 'localhost'
PORT = 9090
TABLES = ['tweets', 'users', 'hashtags', 'analytics']

def run():
    print(f"Connexion a HBase {HOST}:{PORT}...")
    conn = happybase.Connection(HOST, port=PORT)

    tables = [t.decode() for t in conn.tables()]
    print(f"Tables trouvees : {tables}")

    for t in TABLES:
        assert t in tables, f"ERREUR : table '{t}' manquante !"
        print(f"  OK  Table '{t}' presente")

    # Test ecriture + lecture
    table = conn.table('tweets')
    key = b'test_row_001'
    table.put(key, {
        b'content:text':       b'Test HBase OK',
        b'meta:likes':         b'0',
        b'analysis:sentiment': b'neutral'
    })
    row = table.row(key)
    assert row[b'content:text'] == b'Test HBase OK'
    print("  OK  Ecriture et lecture sur 'tweets' : reussi")

    table.delete(key)
    conn.close()
    print("\nConnectivite HBase : TOUT OK")

if __name__ == '__main__':
    run()