# Reference photographs

Downloaded from Wikimedia Commons (scaled to about 1600 to 1920 px wide) and used only to sample
stone colours, joint colours and block proportions for the wall textures. They are not shipped in
the app. `Scripts/analyze_walls.py` does the colour sampling and writes `wall-profile.json`;
block proportions were read from the square-on photographs by hand.

| File | Used for | Author | Licence | Page |
|---|---|---|---|---|
| `kotel-closeup.jpg` | Western Wall stone and joint colours | Danielrosehill | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Western_Wall_stones,_closeup.jpg |
| `kotel-1900-drafted.jpg` | Western Wall course height, block lengths, margin width (scaled by the standing figure) | Woodburytype, c. 1871-1876; Rijksmuseum | CC0 | https://commons.wikimedia.org/wiki/File:Twee_gesluierde_figuren_voor_de_Klaagmuur_te_Jeruzalem_Wailing_Place_of_Jews_(showing_drafted_stones)_(titel_op_object),_RP-F-2001-7-409-1.jpg |
| `kotel-extension.jpg` | Further Herodian length-to-height ratios (Little Western Wall) | Davidbena | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Hewn_stones_that_make-up_extension_of_Western_Wall.jpg |
| `hasmonean-tower.jpg` | Tower and city-wall stone colours, joint colour, block proportions (Citadel tower base; the Ottoman parapet below it was left out) | Ian Scott | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Hasmonean_Masonry_from_a_Tower_(3622470040).jpg |

## Owner's photographs

Supplied by the project owner; kept out of version control (`.gitignore`) because several show people.

| File | Used for |
|---|---|
| `PXL_20210404_105118071.jpg` | Western Wall stone and joint colours (sunlit Herodian courses seen from the plaza) |
| `PXL_20210329_070910866.jpg` | City-wall stone and joint colours (Old City wall from close by; Ottoman wall with reused ancient blocks) |
| `kotel-frontal-user.jpg` | Western Wall course heights and block lengths (`measure_courses.py`: 108 blocks in six Herodian courses). A watermarked stock image, used for measurement only; nothing from it is reproduced. |

The other eleven `PXL_*` photographs (the Ophel excavations, the Kidron tombs, the Lions' and Zion
Gates, the east wall, the Citadel) were looked at but not sampled: the masonry in them is too
distant, too oblique, or later than the first century.

### Reference pictures for the look (attached in the conversation)

| File | Used for |
|---|---|
| `user-tower-and-wall.jpg`, `user-tower.jpg` | Colour of the city walls and towers; the model for towers and walls built of the same coursed stone with a crenellated parapet |
| `user-arcade.jpg` | Colour of dressed stone (courts, gate frames, arcades); the model for the arcaded porticoes and for arches built of the wall stone with voussoirs |

Colours are used as sampled, without white-balance correction, except that blue is reduced by 9%
and green by 2% because the renderer adds its own sky light.

## Processing

1. `analyze_walls.py` samples stone patches and joints, drops plants, paper and the shadowed
   (blue-lit) patches, and writes `wall-profile.json`.
2. `update_profiles.py` writes the palettes into `Sources/JerusalemKit/MasonryProfile.swift`.
3. `measure_courses.py` finds courses and joints in a square-on photograph.
