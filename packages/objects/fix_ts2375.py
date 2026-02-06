#!/usr/bin/env python3
import re
from collections import defaultdict

error_info = [
    ('src/cell-messages.ts', 79), ('src/cell-messages.ts', 124), ('src/cell-messages.ts', 161),
    ('src/cell-messages.ts', 195), ('src/cell-messages.ts', 279), ('src/cell-messages.ts', 342),
    ('src/cell-messages.ts', 384), ('src/city-messages.ts', 177), ('src/city-messages.ts', 258),
    ('src/city-messages.ts', 313), ('src/city-messages.ts', 381), ('src/city-messages.ts', 445),
    ('src/city-messages.ts', 483), ('src/city-messages.ts', 517), ('src/city-messages.ts', 564),
    ('src/city-messages.ts', 607), ('src/city-messages.ts', 689), ('src/city-messages.ts', 752),
    ('src/city-messages.ts', 787), ('src/city-messages.ts', 841), ('src/city-messages.ts', 876),
    ('src/city-messages.ts', 909), ('src/group-messages.ts', 129), ('src/group-messages.ts', 179),
    ('src/group-messages.ts', 221), ('src/group-messages.ts', 256), ('src/group-messages.ts', 293),
    ('src/group-messages.ts', 379), ('src/group-messages.ts', 480), ('src/group-messages.ts', 580),
    ('src/guild-messages.ts', 147), ('src/guild-messages.ts', 205), ('src/guild-messages.ts', 272),
    ('src/guild-messages.ts', 329), ('src/guild-messages.ts', 381), ('src/guild-messages.ts', 415),
    ('src/guild-messages.ts', 448), ('src/guild-messages.ts', 511), ('src/guild-messages.ts', 575),
    ('src/guild-messages.ts', 638), ('src/guild-messages.ts', 736), ('src/guild-messages.ts', 805),
    ('src/guild-messages.ts', 874), ('src/guild-messages.ts', 935), ('src/guild-messages.ts', 1001),
    ('src/guild-messages.ts', 1093), ('src/ship-messages.ts', 263), ('src/ship-messages.ts', 376),
    ('src/ship-messages.ts', 398), ('src/ship-messages.ts', 448), ('src/ship-messages.ts', 497),
    ('src/ship-component-messages.ts', 124), ('src/ship-component-messages.ts', 204),
    ('src/ship-component-messages.ts', 392), ('src/ship-component-messages.ts', 491),
    ('src/ship-component-messages.ts', 584), ('src/survey-messages.ts', 129),
    ('src/survey-messages.ts', 181), ('src/survey-messages.ts', 343), ('src/survey-messages.ts', 370),
    ('src/vendor-messages.ts', 86), ('src/vendor-messages.ts', 155), ('src/vendor-messages.ts', 241),
    ('src/vendor-messages.ts', 281), ('src/vendor-messages.ts', 322), ('src/vendor-messages.ts', 392),
    ('src/vendor-messages.ts', 464), ('src/vendor-messages.ts', 507), ('src/vendor-messages.ts', 552),
    ('src/vendor-messages.ts', 627), ('src/vendor-messages.ts', 696),
]

file_lines_map = defaultdict(list)
for fp, ln in error_info:
    file_lines_map[fp].append(ln)

for filepath, lines in file_lines_map.items():
    with open(filepath, 'r') as f:
        content = f.read()
    fl = content.split('\n')
    for eln in sorted(lines, reverse=True):
        idx = eln - 1
        rt = None
        for i in range(idx - 1, max(idx - 5, 0) - 1, -1):
            m = re.search(r'\):\s+(\w+)\s*\{', fl[i])
            if m:
                rt = m.group(1)
                break
        if not rt:
            print(f'WARN: no return type {filepath}:{eln}')
            continue
        bd = 0
        fc = False
        for i in range(idx, len(fl)):
            for ch in fl[i]:
                if ch == '{':
                    bd += 1
                elif ch == '}':
                    bd -= 1
                    if bd == 0:
                        fl[i] = fl[i].replace('};', '} as ' + rt + ';', 1)
                        fc = True
                        break
            if fc:
                break
        if not fc:
            print(f'WARN: no close {filepath}:{eln}')
    with open(filepath, 'w') as f:
        f.write('\n'.join(fl))
    print(f'Fixed {filepath}: {len(lines)} assertions')
