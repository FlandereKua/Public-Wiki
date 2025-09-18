# {{Secret Character}} Recruitment Template

How to use
- Secret Characters possess one exclusive tierless node. Use the exact square-case format: `[{{Unique Node Name}} - Unique]`.
- Do NOT assign a Tier to Unique nodes. Unique nodes may evolve; define clear evolution triggers and effects.
- Keep all node names in [Square Case] and include Acquisition and Mitigation where relevant.
- Structure recruitment as a Chain Quest with escalating stakes and at least one alternate path.
- Define clear Failure Conditions and map them to outcomes (best to worst). If the character becomes an enemy, link to their appearance in an enemy/boss entry.
- After finalizing, document the Unique node and other node effects in the master `Node/Node Effect List.md`. Keep zone files to acquisition/mitigation only.

---

## Character Profile
{{Character Name}} - {{Title}}
*   Description: 2–3 sentences on personality, motive, combat role, and why they are secret/hidden.
*   Tier: {{Current Tier}}
*   Notable Nodes:
    *   `[{{Unique Node Name}} - Unique]`: One-sentence effect summary.
        *   Caution: Unique Node can evolve; see Evolution section for stages and trigger conditions.
    *   `[{{Secondary Node A}} - Tier {{Current Tier - 1 to - 2}}]`: Another defining non-unique node.
    *   `[{{Secondary Node B}} - Tier {{Current Tier - 1 to - 2}}]`: Another defining non-unique node.
*   Role in Party: {{Controller | Striker | Support | Tank | Hybrid}}. How they change encounter approach.
*   Recruitment Archetype: {{Investigation | Trial by Combat | Protection Escort | Social Leverage | Puzzle}}.
*   Learnable Nodes (Optional): `[{{Teach A}} - Tier 1]`, `[{{Teach B}} - Tier 1]`

---

## Unique Node — Evolution
Define how the Unique node changes over time. Include clear player-facing triggers, costs, and effects. Avoid raw numeric scaling; use qualitative upgrades.

- Base Form
  - `[{{Unique Node Name}} - Unique]`: Effect at recruitment.
  - Triggers/Costs: {{e.g., Complete Quest A; gain 3 Favor; perform action N times}}.
  - Limitations: {{cooldown, resource, positioning}}.

- Evolution I
  - New Effect: {{describe added property or improved scope}}.
  - Trigger: {{story beat or performance threshold}}.
  - Cost/Tradeoff: {{resource, downtime, risk, lock-in}}.

- Evolution II (Optional)
  - New Effect: {{advanced property, synergy unlock}}.
  - Trigger: {{final quest or rare condition}}.
  - Cost/Tradeoff: {{permanent change, new vulnerability}}.

Notes
- Each Evolution should noticeably shift playstyle or open new lines of play.
- At least one evolution path should be missable or require an alternate approach.

---

## Chain Quest
Outline 2–5 steps. Each step should progress motive, reveal backstory, and test a different axis (combat, stealth, social, exploration).

### {{Quest A}} — {{Location}}
*   Description: 1–2 paragraphs summarizing the situation, stakes, and approach vectors.
*   Objectives:
    - {{Objective 1}}
    - {{Objective 2}}
*   Difficulty: {{Easy | Moderate | Hard | Very Hard}}
*   Rewards on Success: {{progress flags, clues, temporary boons}}
*   Penalties on Failure: {{lost time, reputation hit, increased patrols}}

### {{Quest B}} — {{Location}}
*   Description: …
*   Objectives:
    - …
*   Difficulty: …
*   Rewards on Success: …
*   Penalties on Failure: …

### {{Quest C}} — {{Location}}
*   Description: …
*   Objectives:
    - …
*   Difficulty: …
*   Rewards on Success: …
*   Penalties on Failure: …

### {{Quest Final}} — {{Location}}
*   Description: 1–2 paragraphs culminating decision or trial that proves compatibility with the party.
*   Difficulty: {{Hard | Very Hard | Apex}}
*   Outcomes:
    - Recruit: {{conditions required}}
    - Alternate: {{conditions for a different evolution/path}}
    - Fail Forward: {{conditions where recruitment is deferred}}

---

## Failure Conditions
Secret Characters have explicit failure tracks. Define thresholds and consequences.

Examples (pick and adapt)
- Favorability falls below {{X}} due to choices or betrayal.
- Fail to complete {{Quest}} before {{deadline/event}}.
- Break an oath or violate a taboo tied to the character’s ethos.
- Collateral harm to {{protected NPC/area/artifact}}.

If recruitment fails, resolve one of the following (best to worst)
- Delayed Recruitment: Character disappears; becomes available later under different conditions.
- Locked Out: Character becomes unrecruitable this playthrough.
- Death: Character dies as a consequence of failure.
- Adversary Turn: Character becomes an enemy (mini-boss/boss). Define encounter and alternate redemption path if any.

Tracking & Recovery
- Favor System: Document how Favor is gained/lost and thresholds for warnings and lock-outs.
- Redemption Path (Optional): Define a costly, limited chance to recover recruitment (requires different objectives or sacrifices).

---

## Integration Notes (Designer)
- Balance Target: Secret character power ≈ zone difficulty to zone +1, offset by scarcity and failure risk.
- Node Tiers: Unique node is tierless; secondary nodes follow local zone tier logic.
- Cross-Zone Links: Reference towns or hubs for mitigations and services related to this character.
- Narrative Hooks: Provide at least two discoverability vectors (rumors, environmental storytelling, rare encounters).
- Documentation: Add all node effects (including Unique) to `Node/Node Effect List.md` under a Secret Characters section or their origin zone.

---

## Authoring Checklist
- [ ] Defined `[{{Unique Node Name}} - Unique]` with clear base effect and evolutions.
- [ ] Listed secondary nodes with tiers and acquisition logic.
- [ ] Wrote 2–5 Chain Quests with varied gameplay and clear success/failure states.
- [ ] Specified Failure Conditions and mapped outcomes (best → worst).
- [ ] Provided integration notes and cross-links to zones/towns.
- [ ] Updated master Node Effect List with the Unique node and related effects.
