const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const { SerialPort } = require('serialport'); // Import SerialPort
const { ReadlineParser } = require('@serialport/parser-readline'); // Import ReadlineParser
const path = require('path'); // To handle file paths

let mainWindow;
let jsonEditorWindow; // Window for JSON editing

// COM port configuration with default port and baud rate
let portPath = 'COM4'; // Default port, modifiable from the UI
const baudRate = 9600;

// Define a writable path for the JSON file
const userDataPath = app.getPath('userData');
const jsonFileName = 'userDatabase.json';
const jsonFilePath = path.join(userDataPath, jsonFileName);

// Function to initialize JSON file in user data directory
function initializeJsonFile() {
    if (!fs.existsSync(jsonFilePath)) {
        // Copy the default JSON file from the app directory to the user data directory
        const defaultJsonPath = path.join(__dirname, jsonFileName);
        if (fs.existsSync(defaultJsonPath)) {
            fs.copyFileSync(defaultJsonPath, jsonFilePath);
            console.log('JSON file copied to user data directory:', jsonFilePath);
        } else {
            console.error('Default JSON file does not exist:', defaultJsonPath);
            fs.writeFileSync(jsonFilePath, JSON.stringify([], null, 2), 'utf8');
            console.log('Created empty JSON file at:', jsonFilePath);
        }
    }
}

// Load JSON data
function loadJsonData() {
    try {
        const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
        console.log('JSON data loaded successfully:', data);
        return data;
    } catch (error) {
        console.error('Error reading JSON file:', error);
        return []; // Fallback to empty array
    }
}

// Save JSON data
function saveJsonData(data) {
    try {
        fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('JSON data saved successfully.');
    } catch (error) {
        console.error('Error saving JSON file:', error);
    }
}

let jsonData = loadJsonData(); // Load data on startup

// Function to create the main Electron window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    // Optional: Open DevTools for debugging
    // mainWindow.webContents.openDevTools();
}

// Function to create the JSON editor window
function openJsonEditor() {
    if (jsonEditorWindow) {
        jsonEditorWindow.focus();
        return;
    }

    jsonEditorWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    jsonEditorWindow.loadFile('jsonEditor.html');

    jsonEditorWindow.on('closed', () => {
        jsonEditorWindow = null;
    });

    // Optional: Open DevTools for debugging
    // jsonEditorWindow.webContents.openDevTools();
}

// Function to send data to the renderer process
function sendDataToRenderer(channel, data) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(channel, data);
    } else {
        console.error('mainWindow is not defined or webContents is not ready!');
    }
}

// Function to send error messages to the renderer
function sendErrorToRenderer(channel, message) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(channel, { message });
    } else {
        console.error('mainWindow is not defined or webContents is not ready!');
    }
}

// Function to check if the received userCode matches a record in the JSON file
function compareWithJson(userCode) {
    const entry = jsonData.find(person => person.userCode === userCode);
    if (entry) {
        return entry.name; // Return the name if a match is found
    }
    return null; // Return null if no match is found
}

// Function to initialize the serial port
let port = null;

function initializePort(path) {
    if (port && port.isOpen) {
        port.close((err) => {
            if (err) {
                console.error('Error closing serial port:', err.message);
                sendErrorToRenderer('serial-port-error', `Failed to close ${path}: ${err.message}`);
                return;
            }
            console.log('Serial port closed successfully');
            openPort(path);
        });
    } else {
        openPort(path);
    }
}

function openPort(path) {
    port = new SerialPort({ path: path, baudRate: baudRate }, (err) => {
        if (err) {
            console.error(`Error opening serial port (${path}):`, err.message);
            sendErrorToRenderer('serial-port-error', `Failed to open ${path}: ${err.message}`);
            return;
        }
        console.log(`Serial port ${path} opened successfully`);
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    // Read data from the serial port and process it
    parser.on('data', (data) => {
        console.log('Data from serial port:', data); // Debugging statement
        const personName = compareWithJson(data.trim()); // Compare data with JSON and trim any whitespace
        if (personName) {
            sendDataToRenderer('display-event', { name: personName });
        } else {
            sendDataToRenderer('display-event', { name: 'Unknown UID' });
        }
    });

    port.on('error', (err) => {
        console.error('Serial Port Error:', err.message);
        sendErrorToRenderer('serial-port-error', `Serial Port Error: ${err.message}`);
    });
}

// IPC handler to set COM port
ipcMain.on('set-com-port', (event, newPort) => {
    console.log(`Setting new COM port: ${newPort}`);
    initializePort(newPort);
});

// IPC handler to list available COM ports
ipcMain.handle('list-com-ports', async () => {
    try {
        const ports = await SerialPort.list();
        // Filter to include only COM ports
        const comPorts = ports.filter(port => port.path.startsWith('COM')).map(port => port.path);
        return comPorts;
    } catch (error) {
        console.error('Error listing COM ports:', error);
        return [];
    }
});

// IPC handlers for JSON data
ipcMain.handle('get-json-data', () => {
    jsonData = loadJsonData(); // Reload data in case of external changes
    return jsonData;
});

ipcMain.on('update-json-data', (event, newData) => {
    jsonData = newData;
    saveJsonData(jsonData);
});

// IPC handler to open JSON editor window
ipcMain.on('open-json-editor', () => {
    openJsonEditor();
});

// Initialize JSON file and main window when the app is ready
app.whenReady().then(async () => {
    initializeJsonFile();
    createWindow();

    // Initialize with the default port
    initializePort(portPath);

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
