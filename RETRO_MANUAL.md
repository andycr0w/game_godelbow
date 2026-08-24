# GODELBOW — Retro Game Manual

> Player-facing copy for the current 24-room TIC-80 test cart. The sheet uses
> the keyboard labels shown by the game; TIC-80 gamepad equivalents are listed
> in the control panel.

## SIDE A — THE SACRED ART OF THE ELBOW

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         G O D   E L B O W                                │
│                    THE SACRED ART OF THE ELBOW                           │
│                              HOW TO PLAY                                 │
│                                                                          │
│             GET THE BALL. CONTROL THE FLIGHT. BREAK THE ROOM.            │
├──────────────────────────┬───────────────────────────────────────────────┤
│        CONTROLS          │                ONE BUTTON. TWO STATES.        │
│                          │                                               │
│  MOVE / FACE   <-  ->    │  NO BALL                        WITH BALL     │
│  AIM           <-  ->    │                                               │
│  JUMP / START  Z         │  X = ELBOW                      X = THROW     │
│  ACTION        X         │  steal / stun / return          aim / dunk    │
│                          │                                               │
│  TIC-80 PAD              │  Walk into a loose ball to pick it up.        │
│  A = Z       B = X       │  If you press X beside it, ELBOW wins first.  │
├──────────────────────────┴───────────────────────────────────────────────┤
│                              BASIC ACTIONS                               │
│                                                                          │
│  [STEAL]       [BOT+o] -- FACE + X --> o -- WALK IN --> [YOU+o]          │
│                                                                          │
│  [QUICK SHOT]  [YOU+o] -- TAP X --> 45 DEGREE THROW --> [RIM]            │
│                                                                          │
│  [READY AIM]   HOLD X, THEN PRESS <- / -> / ^ AND RELEASE X              │
│                THE BOTTOM LINE ONLY SHOWS THE ROOM OBJECTIVE              │
│                                                                          │
│  [STRAIGHT]    HOLD X ... <- OR -> ... RELEASE X                         │
│  [HIGH ARC]    HOLD X ... ^ .......... RELEASE X                         │
│                                                                          │
│  [DUNK]        CARRY NORMAL BALL + JUMP INTO "X DUNK" ZONE + X           │
│                NO EXTRA DUNK BUTTON. NO BOMB DUNKS.                      │
├──────────────────────────────────────────────────────────────────────────┤
│  AIR CONTROL: You may ready a throw in the air. Your momentum continues. │
│  LANDING READY: Land while aiming and you plant your feet until release. │
│  NO DIRECTION: Release a readied throw with no aim for the normal 45°.   │
└──────────────────────────────────────────────────────────────────────────┘
```

## SIDE B — RULES OF THE COURT

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         THE BALL IS THE WEAPON                           │
│                                                                          │
│     TAKE IT  ->  CHOOSE A LINE  ->  THROW IT  ->  FIGHT FOR IT AGAIN     │
│                                                                          │
│     BOT+o  --ELBOW-->  o  --PICK UP-->  YOU+o  --THROW-->  TARGET!*      │
├───────────────────────────────┬──────────────────────────────────────────┤
│        ELBOW SECRETS          │             BOMB PROTOCOL                │
│                               │                                          │
│  Face the incoming ball.      │  1. DODGE the enemy serve.               │
│  Press X while it is airborne.│  2. First floor hit starts 2 SEC.        │
│  Your elbow returns it as a   │  3. PICK UP or ELBOW it back.            │
│  player shot.                 │  4. THROW before the fuse reaches 0.     │
│                               │                                          │
│  Front hit = RETURN           │  The fuse NEVER stops in your hands.     │
│  Back hit  = TROUBLE          │  An elbow return gives NO extra time.    │
│                               │  A live bomb explodes on contact.        │
│  Elbow a carrier to force a   │                                          │
│  drop. Jump, throw, or elbow  │  o* --> launcher / rival / drone --> BOOM│
│  through a charge attempt.    │  o* --> drone body / hoop ------> BOOM   │
├───────────────────────────────┴──────────────────────────────────────────┤
│                            READ THE ROOM                                 │
│                                                                          │
│  GREY PLATFORM     player stands on it; every ball passes through        │
│  DEEP-BLUE WALL    blocks both the player and every ball                 │
│  RED RIM           score when the objective calls for a basket           │
│  SERVER            return its bomb to destroy it                         │
│  DRONE             hit the wide body or drop a shot through its hoop     │
├───────────────────────────────┬──────────────────────────────────────────┤
│        HALF-COURT 1v1         │             24 CHAMBERS                  │
│                               │                                          │
│  New possession? Take the ball│  01-04  MOVE / THROW / AIM / DUNK        │
│  LEFT of the CLEAR line first.│  05-07  STEAL / 1v1 / HIGH ARC           │
│  Then attack the shared hoop. │  08-13  SKY WINDOW / DRONES / BALL HOG   │
│  First to 3 wins.             │  14-20  BOMBS / RETURNS / AIR THIEF      │
│                               │  21-24  HELICOPTER GAUNTLET              │
│                               │                                          │
├───────────────────────────────┴──────────────────────────────────────────┤
│  ONLY ONE BALL EXISTS. WATCH WHO OWNS IT, WHERE IT WILL LAND, AND WHY.   │
│                                                                          │
│  ROOM CLEAR advances automatically. Death retries the current challenge. │
│  ROOM 24 is the current final challenge.                                 │
├──────────────────────────────────────────────────────────────────────────┤
│  TEST CART SERVICE: keyboard A = ROOM SELECT    keyboard S = HITBOXES    │
│                                                                          │
│                CATCH IT. THROW IT. KNOCK IT BACK. AGAIN.                 │
└──────────────────────────────────────────────────────────────────────────┘
```

## Pocket reference

```text
┌──────────────────────────────────────────────────────────────┐
│ GODELBOW // QUICK CARD                                       │
├──────────────────────────────┬───────────────────────────────┤
│ <- ->   MOVE / FACE          │ NO BALL + X   ELBOW           │
│ Z       JUMP                 │ BALL + TAP X  QUICK 45°       │
│ X       ACTION               │ HOLD X + <- -> STRAIGHT       │
│                              │ HOLD X + ^   HIGH ARC         │
│ WALK INTO BALL = PICK UP     │ AIR + DUNK PROMPT + X = DUNK  │
├──────────────────────────────┴───────────────────────────────┤
│ FLYING BALL + FACE + X = RETURN                              │
│ BOMB TOUCHES FLOOR = 2-SECOND FUSE                           │
│ POSSESSION -> LINE -> TARGET -> REBOUND -> POSSESSION        │
└──────────────────────────────────────────────────────────────┘
```
