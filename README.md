# Score Viewer

My makeshift solution to view sheet music and simple MIDI input visualization simultaneously.

Deployed at [sv.cueaz.com](https://sv.cueaz.com).

![Preview Image](preview.gif)

## Browser Support

As of July 2023, Chrome is the only fully supported browser.

|         | [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) | [Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API) | [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) | [Progressive Web App](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) |
| ------- | :-------------------------------------------------------------------------------: | :---------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------: | :--------------------------------------------------------------------------------------: |
| Chrome  |                                         O                                         |                                       O                                       |                                               O                                               |                                            O                                             |
| Firefox |                                         O                                         |                                       O                                       |                                               X                                               |                                            X                                             |
| Safari  |                                         O                                         |                                       X                                       |                                               O                                               |                                            O                                             |

## Limitations

- PDF Annotation Layer is not currently implemented.
