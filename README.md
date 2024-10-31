# Redsis Listener [voice-mod]

## Overview

Redsis Listener is an Electron-based application designed to interface with Arduino via a serial connection. It reads unique user codes from RFID or other devices and displays the corresponding employee names. The application features a user-friendly interface, JSON data management for employee records, and customizable COM port settings.

## Features

- **Real-time Serial Communication**: Connect to Arduino or other serial devices and read user codes.
- **JSON Data Management**: Load, edit, and save employee records stored in a JSON file.
- **Dynamic User Interface**: Easily switch between different COM ports and visualize events.
- **Modal JSON Editor**: Edit JSON data in a separate pop-out window.

## Requirements

- **Node.js**: Version 14 or higher
- **Electron**: Version 13 or higher
- **SerialPort**: Library for serial communication
- **Fritzing**: For schematic design

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/your-repository.git
   cd your-repository
