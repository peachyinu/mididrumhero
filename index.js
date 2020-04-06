const { app, BrowserWindow } = require('electron');
const { ipcMain } = require('electron');
const storage = require('electron-json-storage');
const firstRun = require('electron-first-run');
const path = require('path');
const midi = require('midi');
const input = new midi.Input();
const { vJoy, vJoyDevice } = require('vjoy');
const fs = require('fs');

let device = vJoyDevice.create(1);



function createWindow () {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: true,
    title: "MidiDrumHero",
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: true
    }
  });

  storage.setDataPath(storage.getDefaultDataPath());
  console.log(storage.getDataPath());
  if (firstRun() == true) {
    storage.set('config', {"midiConfig":[]}, (error => {
      if (error) throw error;
    }));
  }

  win.loadFile('src/index.html');
  //win.setMenu(null);
}

ipcMain.on('getVjoyStatus', (event, arg) => {
  // Alert the user if vJoy is not installed on the current computer
  if (!vJoy.isEnabled()) {
    event.returnValue = false
  } else {
    event.returnValue = true
  }
});

ipcMain.on('message', (event, arg) => {
  console.log(arg);
});

ipcMain.on('saveDrumPad', (event, arg) => {
  storage.get('config', (error, data) => {
    if (error) throw error;
    data["midiConfig"].push(arg);
    
    storage.set('config', data, (err) => {
      if (err) throw err;
    });
  });
});

ipcMain.on('removeDrumPad', (event, arg) => {
  storage.get('config', (error, data) => {
    if (error) throw error;

    data["midiConfig"].splice(arg, 1);
    
    storage.set('config', data, (err) => {
      if (err) throw err;
    });
  });
});

ipcMain.on('getDrumPads', (event, arg) => {
  storage.get('config', (error, data) => {
    if (error) throw error;

    event.returnValue = data["midiConfig"];
  });
});

ipcMain.on('getMidiDevices', (event, arg) => {
  var devices = {}
  for (var i = 0; i < input.getPortCount(); i++) {
    devices[input.getPortName(i)] = i
  }
  event.returnValue = devices;
});

ipcMain.on('openMidi', (event, arg) => {
  input.closePort()
  input.openPort(arg)
});

function vJoySetButton(button, state) {
  device.buttons[button].set(state)
}



function getMidiConfig() {
  var path = storage.getDataPath()

  let rawdata = fs.readFileSync(path + "\\config.json");
  let parsed = JSON.parse(rawdata);
  return parsed["midiConfig"]
}


var midiConfig = getMidiConfig()


function setMidiConfig(){
  midiConfig = getMidiConfig()
}

ipcMain.on('changedConfig', (event, arg) => {
  setTimeout(setMidiConfig, 250)
});

input.on('message', (deltaTime, message) => {
  // The message is an array of numbers corresponding to the MIDI bytes:
  //   [status, data1, data2]
  // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
  // information interpreting the messages.
  console.log(`m: ${message} d: ${deltaTime}`);
  //win.webContents.send('midiLog', message)

  if (message[0] >= 144 && message[0] <= 159 && message[2] != 0) {
    for (var entry of midiConfig) {
      
      if ((parseInt(entry["midi"]) == message[1]) && (parseInt(entry["velocity"]) <= message[2])) {
        
        vJoySetButton(parseInt(entry["button"]), true)
        setTimeout(vJoySetButton, 50, parseInt(entry["button"]), false)
        break
      }
    }
  }
});

app.on('ready', createWindow);
