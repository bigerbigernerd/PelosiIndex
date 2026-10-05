# Research Skills

All six research Skills are included as source. Downloadable archives and the combined `pelosi-skills.zip` are generated under `web/public/downloads/`.

| Skill | Source |
| --- | --- |
| SEC 13F comparison | [sec-13f-diff](../web/skills-src/sec-13f-diff/SKILL.md) |
| House PTR reader | [congress-ptr-reader](../web/skills-src/congress-ptr-reader/SKILL.md) |
| SEC Form 4 tracker | [form4-insider-tracker](../web/skills-src/form4-insider-tracker/SKILL.md) |
| Public graph queries | [pelosi-graph-data](../web/skills-src/pelosi-graph-data/SKILL.md) |
| Disclosure research notes | [disclosure-research](disclosure-research/SKILL.md) |
| Verified data contributions | [pelosi-data-contributor](../web/skills-src/pelosi-data-contributor/SKILL.md) |

To install in a compatible agent, extract a downloadable Skill archive into that agent's Skills directory, keeping `SKILL.md`, scripts and references together. Official SEC fetching requires your own descriptive `SEC_USER_AGENT`; website browsing and the included snapshot require no API key.

Rebuild archives from source: `python3 web/scripts/build-skills.py`.
