"use strict";

const GAMEPAD_MAPPINGS = {

    "046d-c21a": { // Logitech Precision
        buttons: [
            1,
            2,
            0,
            3,
            4, // 4-9, no-remap
            5,
            6,
            7,
            8,
            9,
            null, // no stick buttons
            null,
            "a-1", // D-pad is axes
            "a+1",
            "a-0",
            "a+0"
        ],
        axes: [ // no axes
            null,
            null,
            null,
            null
        ]
    },

    "046d-c216": { // Logitech Dual Action
        buttons: [
            1,
            2,
            0,
            3,
            4, // 4-11, no-remap
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            "a-5", // D-pad is axes
            "a+5",
            "a-4",
            "a+4"
        ],
        axes: [ // all axes, no-remap
            0,
            1,
            2,
            3
        ]
    }
    
};

// Identifiers are inconsistent for some reason
function firefoxGetUsbId(id) {
    // The USB ID is a prefix
    return id.substring(0, 9);
}

function chromeGetUsbId(id) {
    // Contains "(Vendor: HHHH Product: HHHH)" style ID
    var vendorMatch = "(Vendor: ";
    var vendorIdIdx = id.indexOf(vendorMatch) + vendorMatch.length;
    var productMatch = "Product: ";
    var productIdIdx = id.indexOf(productMatch) + productMatch.length;
    return id.substring(vendorIdIdx, vendorIdIdx + 4) + "-" + id.substring(productIdIdx, productIdIdx + 4);
}

function createVirtualButton( sourceGamepad, specifier ) {
    if(typeof(specifier) == "number") {
        // Should be a live object reference
        return sourceGamepad.buttons[specifier];
    } else if(typeof(specifier) == "string") {
        if( specifier.charAt(0) == "a" ) {
            // Use an axis as a button
            return Object.create(null, {
                source: {
                    enumerable: false,
                    writable: false,
                    value: sourceGamepad
                },
                sourceAxis: {
                    enumerable: false,
                    writable: false,
                    value: parseInt(specifier.charAt(2))
                },
                pressed: { // TODO do fancier threshold stuff
                    get: specifier.charAt(1) == "-" ? // can't use arrow functions, don't want to use lexical scoping
                        (function() { return this.source.axes[this.sourceAxis] < 0; }) : // negative direction
                        (function() { return this.source.axes[this.sourceAxis] > 0; }) // positive direction
                },
                value: {
                    get: specifier.charAt(1) == "-" ?
                        (function() { return -this.source.axes[this.sourceAxis] * this.pressed; }) : // negative direction
                        (function() { return this.source.axes[this.sourceAxis] * this.pressed; }) // positive direction
                }
            });
        }
    }
    return null;
}

function standardizeGamepad( gamepad ) {

    // Return standard gamepads without modification
    if( gamepad.mapping == "standard" ) {
        return gamepad;
    }

    // Check the ID for a standardizable format
    var usbId = firefoxGetUsbId(gamepad.id);
    usbId = !(usbId in GAMEPAD_MAPPINGS) ? chromeGetUsbId(gamepad.id) : usbId;
    if( !(usbId in GAMEPAD_MAPPINGS) ) {
        console.log("Failed to find a compatible gamepad mapping!");
        return null; // 
    }

    // Gets into some heavy Javascript here with the propertiesObject
    var standardGamepad = Object.create(null);
    standardGamepad.id = 
    standardGamepad.index = gamepad.index;

    var remapping = GAMEPAD_MAPPINGS[usbId];

    return Object.create(null, {
        source: {
            enumerable: false,
            writable: false,
            value: gamepad
        },
        axesRemap: {
            enumerable: false,
            writable: false,
            value: remapping.axes
        },
        id: {
            value: gamepad.id + " (Standardized)",
            writable: false
        },
        index: {
            value: gamepad.index,
            writable: false
        },
        connected: { // make a passthrough accessor
            get: (function() { return this.source.connected; })
        },
        timestamp: { // make a passthrough accessor
            get: (function() { return this.source.timestamp; })
        },
        mapping: {
            value: "standard",
            writable: false
        },
        axes: {
            get: (function() { return this.axesRemap.map(index => index == null ? 0.0 : this.source.axes[index] ); })
        },
        buttons: {
            value: remapping.buttons.map(buttonIndex => buttonIndex == null ? null : createVirtualButton(gamepad, buttonIndex) ),
            writable: false
        }
    });

}

function drawGamepadDebugger( ctx, gamepad ) {
    if( gamepad.mapping == "standard" ) {
        ctx.save();

        ctx.fillStyle = gamepad.buttons[0].pressed ? "#F00" : "#FFF";
        ctx.beginPath();
        ctx.arc(80, 40, 5, 0, 2 * Math.PI );
        ctx.fill();

        ctx.fillStyle = gamepad.buttons[1].pressed ? "#FF0000" : "#FFFFFF";
        ctx.beginPath();
        ctx.arc(90, 30, 5, 0, 2 * Math.PI );
        ctx.fill();

        ctx.fillStyle = gamepad.buttons[2].pressed ? "#FF0000" : "#FFFFFF";
        ctx.beginPath();
        ctx.arc(70, 30, 5, 0, 2 * Math.PI );
        ctx.fill();

        ctx.fillStyle = gamepad.buttons[3].pressed ? "#FF0000" : "#FFFFFF";
        ctx.beginPath();
        ctx.arc(80, 20, 5, 0, 2 * Math.PI );
        ctx.fill();

        ctx.fillStyle = gamepad.buttons[12].pressed ? "#FF0000" : "#FFFFFF";
        ctx.beginPath();
        ctx.arc(20, 20, 5, 0, 2 * Math.PI );
        ctx.fill();

        ctx.fillStyle = gamepad.buttons[13].pressed ? "#FF0000" : "#FFFFFF";
        ctx.beginPath();
        ctx.arc(20, 40, 5, 0, 2 * Math.PI );
        ctx.fill();

        ctx.fillStyle = gamepad.buttons[14].pressed ? "#FF0000" : "#FFFFFF";
        ctx.beginPath();
        ctx.arc(10, 30, 5, 0, 2 * Math.PI );
        ctx.fill();

        ctx.fillStyle = gamepad.buttons[15].pressed ? "#FF0000" : "#FFFFFF";
        ctx.beginPath();
        ctx.arc(30, 30, 5, 0, 2 * Math.PI );
        ctx.fill();

        ctx.restore();
    }
    
}

