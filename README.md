# Ultra Tab

This is the tabs command palette extension I've always wanted.

I made this because I have the tab row/bar disabled in my main browser.
I have tabs disabled for the same reason I have the operating system dock disabled across my different computers:
I don't need to know what's open at all times or see my apps until it actually comes down to switch.

Also, for switching between the applications in my computer, I use a command palette: Raycast.
I think of the browser as a mini operating system and tabs as mini applications and the same reasoning applies; hence this extension.

I can't make the extension automatically turn off your tabs because browsers don't support that by default (as far as I know), so this is for those that have already done the work to hide their tabs and have experimented with stuff like this.

I've had tabs disabled for years at this point, which begs the question, what did I do until I made this? At first, I used the Vimium tab switcher thing then eventually I started using sideberry with a keyboard toggle. I liked Sideberry a lot better; however, toggling and untoggling a sidebar triggers a page reflow because the width of the DOM changes, and I found this really annoying after some time.

I've been prototyping this for almost a year now and this is the third or fourth rewrite that finally stuck.

## Design Challenges

## Adding To Your Browser

The steps are slightly different between browsers, but they both start the same way:

`bun install`
`bun run release`

That builds the extension and hands you a clean, ready-to-load folder per browser: `dist-chrome/` and `dist-firefox/`, each with a single `manifest.json`.
It also drops a matching `.zip` next to each in case you want to hand one off; pass `--no-zip` if you don't care about those, or `--target chrome` / `--target firefox` if you only want one.

### Chrome

Open the chrome extension manager and toggle on developer mode in the top right.
Press "Load Unpacked" and select `dist-chrome`.

For the extension to be enabled in your tabs, you need to reload them.

Also, there is no default toggle hotkey set for the extension on Chrome.
To set the toggle hotkey, hit keyboard shortcuts in the extension manager and set it from there.

### Firefox

Go to "about:addons" and click the settings gear button to the right of the "Manage Your Extensions" title.
Hit install add ons from file and then select "manifest.json" inside `dist-firefox`.

If you want to sanity-check the Firefox build the way the store will, `bun run verify:firefox` builds it and runs web-ext's linter over it.

## Roadmap

- tab groups
- unloading tabs
- quick links
- extensions management
- reading list
