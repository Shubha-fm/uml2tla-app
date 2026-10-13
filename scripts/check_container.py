"""Smoke-test the running production container using only the standard library."""
import json
import time
from urllib.request import Request, urlopen
from urllib.error import URLError

url = 'http://127.0.0.1:8000'
for attempt in range(60):
    try:
        with urlopen(url + '/api/health', timeout=2) as response:
            health = json.load(response)
        break
    except URLError:
        time.sleep(0.5)
else:
    raise RuntimeError('Container did not become healthy')
assert health['tlc_available'], health
with urlopen(url, timeout=5) as response:
    assert b'<html' in response.read().lower()
for filename, expected in [('examples/tlc_safe.json','PASSED'),('examples/tlc_unsafe.json','VIOLATED')]:
    with open(filename,'rb') as source:
        request = Request(url + '/api/verify', data=source.read(), headers={'Content-Type':'application/json'})
    with urlopen(request, timeout=30) as response:
        result = json.load(response)
    assert result['statistics']['result'] == expected, result
    print(filename, expected)
print('Container smoke tests passed')
