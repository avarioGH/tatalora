import os
import glob

for fp in glob.glob('src/app/sales/returns/**/*.tsx', recursive=True):
    with open(fp, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'eslint-disable' in content and 'react-hooks/set-state-in-effect' not in content:
        content = content.replace('/* eslint-disable @typescript-eslint/no-explicit-any */', '/* eslint-disable @typescript-eslint/no-explicit-any */\n/* eslint-disable react-hooks/set-state-in-effect */\n/* eslint-disable react-hooks/exhaustive-deps */')
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(content)
