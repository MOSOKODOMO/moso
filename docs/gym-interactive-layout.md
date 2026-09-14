# Interactive gym background measurements

Asset: `public/studio100/gym-interactive.png`  
Raster: 1672 × 941 pixels. Display plane: 32 × 18 world units, centred at (16,9).  
Source and both image-generation prompts: `docs/gym-art-prompt.txt`.

The background preserves the warm illustrated timber, ivory, amber and dark teal palette. The machines have been lowered from the old rear wall line to close to the character's ground level. The hanging bag and its chain are absent; only the support and small hook remain.

## Coordinate convention

Pixel coordinates use top-left origin. World coordinates use bottom-left origin:

`worldX = pixelX / 1672 * 32`  
`worldY = 18 - pixelY / 941 * 18`

These are visual measurements of the final artwork, generally within about 0.1–0.2 world units. The drawn perspective makes some surfaces slope. A single collision plane at the listed middle height is a practical approximation; the visible decorative bikes/racks are not collision geometry by themselves.

## Suggested jump surfaces

| Surface | Pixel x range | Pixel top y | World x range | World top y |
| --- | --- | --- | --- | --- |
| left bike seat | 199–238 | 591 | 3.81–4.56 | 6.7 |
| right bike seat | 307–346 | 590 | 5.88–6.62 | 6.71 |
| treadmill belt | 447–574 | 693 | 8.56–10.99 | 4.74 |
| low bench | 846–970 | 672 | 16.19–18.56 | 5.15 |
| dumbbell rack | 626–839 | 605 | 11.98–16.06 | 6.43 |
| kettlebell rack | 1040–1123 | 573 | 19.9–21.49 | 7.04 |
| squat bench | 1290–1403 | 659 | 24.69–26.85 | 5.39 |
| squat crossbar | 1245–1424 | 355 | 23.83–27.25 | 11.21 |

- Bike seats are narrow: root may expand each collider by 0.1–0.2 for forgiving landing, without introducing a visible new platform.
- Treadmill belt slopes from about pixel y684 at rear to y718 at front. The table gives a middle-height platform. Its front lip is lower.
- Low bench is the broadest accessible first jump surface; top spans roughly y668–684.
- Dumbbell/kettlebell racks are full of fixed stored weights. The suggested top height tracks the top silhouettes, not a newly added plank.
- The squat-frame crossbar is optional as a high platform; its two uprights extend down to the floor.

## Floor and movement alignment

Equipment feet/bases are mostly around pixel y738–755, or world y3.56–3.88, close to the existing hero floor y3.55. The floor mat's front edge is near pixel y767 / world y3.33. This final image has less empty foreground than the first generation, which had left the machines too high.

Far-left lift door:
- approximate frame x30–177 px = world x0.57–3.39;
- entrance ground point about (102,725) px = world (1.95,4.13);
- root can retain a ground-level exit hotspot around world x1.8–2.1 and y3.55.

## Animated punching bag

- Empty metal support ends around pixel (1170,318).
- Small hanging hook centre/end: **pixel (1170,352), world (22.39,11.27)**.
- Recommend using **world (22.4,11.25)** as the dynamic pendulum anchor.
- Clear bay beneath is approximately world x21.55–23.2.
- A narrow teal/amber bag around 0.95–1.15 units wide can extend down to world y5.0–5.4, with chain joining the hook. Its body can be roughly 3.0–3.4 units tall. The anchor-to-body centre length then falls around 4.2–4.7.
- Keep the visual swing modest before impact; root owns hit response, pendulum limits, collision and sound.
- There is **no baked bag or long chain** to produce a duplicate behind the dynamic object.

## Throwables

The background still contains the normal fixed rack dumbbells and squat-rack barbell. Dynamic pickup props should be separate foreground weights placed beside the rack or on the mat; removing a dynamic prop must not imply that a fixed painted rack weight disappeared. Root owns their spawn/hit/throw behaviour.

No code files were changed for this background deliverable.
