#!/usr/bin/env node
import { render } from "ink";
import { App } from "./ui/App.js";
import { startBackgroundUpdate } from "./updater.js";

startBackgroundUpdate(); // silent self-update in the background; applies next launch
render(<App />);
