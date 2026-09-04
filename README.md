# GODELBOW

A tiny basketball platformer made with TIC-80.

The ball is the only weapon. Steal it, control its flight, and break the room.

## Play

**[Play GODELBOW in your browser](https://andycr0w.github.io/game_godelbow/)**

## Controls

| Key | Action |
| --- | --- |
| ← / → | Move, face, and aim |
| Z | Jump / start |
| X | Elbow / throw / dunk |
| A | Room select |
| S | Show hitboxes |

On a phone in portrait orientation, tap the play icon, then tap **Z** on the
controller below the game. Slide across the D-pad to move or aim; use **Z** to
jump and **X** to act. Hold X, choose a direction, then release X to throw.
The controls support multiple fingers, including movement, jumping and X
together. **A** opens room selection; use the D-pad and Z to choose a room.
Portrait fullscreen keeps the controller and an exit button visible.
In portrait fullscreen the 240x136 play area fills the available width and the
page becomes a handheld view containing only the game screen and controls. If
the browser does not support element fullscreen, the same view opens inside the
browser viewport and its × button returns to the page.
The right-hand buttons are arranged diagonally, with X below-left of Z.
S and A sit in the center below the main controls, in Select / Start positions;
their game functions remain hitboxes and room selection.

The touch controller is hidden in landscape and on devices without touch input.
See [touch validation](tests/TOUCH_VALIDATION.md) for checks and device coverage.

## Features

- 24 single-screen challenge rooms
- Throwing, dunking, rebounds, and elbow returns
- Rival AI, drones, bombs, and helicopters
- Playable directly in the browser

## Manual

Read the [Retro Game Manual](RETRO_MANUAL.md).

## Built with

[TIC-80](https://tic80.com/)
