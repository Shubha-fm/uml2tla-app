"""Install a pinned official TLC release with checksum validation."""
import hashlib
from pathlib import Path
from urllib.request import urlopen

URL = 'https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar'
SHA1 = 'bee4a54f3ee3d4afc347c3240ec2d9e93b075104'

def install():
    target = Path(__file__).resolve().parent / 'tools' / 'tla2tools.jar'
    with urlopen(URL, timeout=60) as response:
        content = response.read()
    if hashlib.sha1(content).hexdigest() != SHA1:
        raise RuntimeError('TLC release checksum mismatch.')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    print('Installed TLC v1.7.4:', target)

if __name__ == '__main__': install()
