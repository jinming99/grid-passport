# Grid Passport - 5-Minute PowerPoint Script

This file stays aligned to `grid-passport-5min-deck.md`.

## Slide 1 - A 500 MW request is not a forecast

What to say:

"AI data-center demand is climbing quickly, but the grid does not plan from requested megawatts alone. The requested number and the operational truth behind that number are not the same thing. Grid Passport exists to close that gap."

## Slide 2 - Demand is rising. Planning certainty is not.

What to say:

"DOE and LBNL frame the demand increase clearly: data centers were about 4.4% of U.S. electricity in 2023, and the projection rises to 6.7% to 12% by 2028. The scale problem is real. But the harder issue is that utilities still cannot plan from raw asks alone."

Asset needed:

- Graph 1: demand growth chart with 2023 and 2028 range

## Slide 3 - The federal record keeps naming the same gap

What to say:

"Across DOE, NERC, and ERCOT, the same concern keeps showing up: planners need more operationally useful disclosure, but applicants cannot safely share everything in plaintext. This is why the bottleneck is a data-sharing problem, not only a supply problem."

Asset needed:

- Optional screenshot: DOE / NERC / ERCOT source snippets

## Slide 4 - The form is becoming more operational

What to say:

"This is where the process is heading. Large-load forms are asking not just who you are and how many megawatts you want, but how you ramp, how you reconnect, what backup assets you have, and what flexibility you can actually commit. Dominion already asks for many of these same categories."

Asset needed:

- Graph or screenshot 2: ERCOT form or four-bucket disclosure diagram

## Slide 5 - Static forms still fail when behavior changes

What to say:

"The NoVA event makes the gap concrete. A static form does not explain a sudden large-load drop, a six-week model-training surge, or a reconnection pattern the control room has never seen. The missing layer is a standing coordination channel."

Asset needed:

- Graph 3: NoVA disturbance chart or simplified drop visual

## Slide 6 - Grid Passport closes the loop

What to say:

"Grid Passport lets the applicant keep the raw playbook local, release only policy-approved planning outputs, receive utility coordination back through the same signed path, and accumulate signed history so every future disclosure is better calibrated than the last."

Asset needed:

- Diagram 4: applicant -> signed disclosure -> utility -> signed notice -> signed memory

## Slide 7 - What the demo proves

What to say:

"In the demo, Owl Compute completes the baseline filing without leaking competitive fields. Then a six-week surge is disclosed before it hits the grid. Then the utility coordinates back. Then the signed residual becomes calibration data for the next run. Same case, different visibility. Proof, not premise."

Asset needed:

- Optional screenshot: applicant view and utility view side by side

## Slide 8 - Close

What to say:

"The data center keeps the playbook. The utility gets the answer. The regulator verifies the chain. That is the missing coordination layer in the federal record, and that is what Grid Passport is built to provide."

## Asset checklist

Send these when ready:

1. Demand-growth graph
2. DOE / NERC / ERCOT screenshots or exact quotes you want on slide 3
3. ERCOT form screenshot or the categories you want shown
4. NoVA event graph
5. Any product screenshots you want on the final two slides

## Build command

From repo root:

`pandoc docs/presentations/grid-passport-5min-deck.md -o docs/presentations/grid-passport-5min-deck.pptx`

