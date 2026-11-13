#!/usr/bin/env python3
"""Fix broken quote in overStreak line of captains.html."""
p = '/home/z/my-project/public/captains.html'
s = open(p, encoding='utf-8').read()
bad = "?'🥇 ':'\")+sc"
good = "?'🥇 ':'')+sc"
assert bad in s, 'pattern not found: %r' % bad
s = s.replace(bad, good)
open(p, 'w', encoding='utf-8').write(s)
print('fixed')
