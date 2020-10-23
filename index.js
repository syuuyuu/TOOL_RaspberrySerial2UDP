const version = "20201023v1z";
const SerialPort = require("serialport");
const udp = require("dgram");
sender = udp.createSocket("udp4");

const ignoreMAC = [
  //  "A",
  //  "0502D366"
];

const targetIP = ["192.168.13.218", "192.168.13.109"];

sender.on("error", (err) => {
  console.log("=== ERROR! ==== ");
});

SerialPort.list().then((ports) => {
  ports.forEach((port) => {
    str = String(port.manufacturer);
    console.log(str);
    if (str.includes("EnOcean") || str.includes("FTDI")) {
      console.log(port.path);
      console.log(port.manufacturer);
      const theport = new SerialPort(port.path, { baudRate: 57600 });
      theport.on("open", () => {});
      theport.on("data", (d) => {
        //        console.log(d);
        if (d.byteLength > 0) {
          dealBuffer(d);
        }
      });
    }
  });
});

const MAX_BYTES_FOR_PACKET = 25;
let receivedBytes = [];
function dealBuffer(buffer) {
  //console.log(buffer);
  if (buffer[0] == 0x55) {
    receivedBytes = [];
    for (let counti = 0; counti < MAX_BYTES_FOR_PACKET && counti < buffer.byteLength; counti++) {
      receivedBytes.push(buffer[counti]);
    }
  } else if (receivedBytes.length < MAX_BYTES_FOR_PACKET) {
    for (let counti = 0; counti < buffer.byteLength && receivedBytes.length < MAX_BYTES_FOR_PACKET; counti++) {
      receivedBytes.push(buffer[counti]);
    }
  } else {
    receivedBytes = [];
  }
  if (receivedBytes.length == MAX_BYTES_FOR_PACKET) {
    let macbytes = receivedBytes.slice(7, 7 + 4);
    let mac = ByteArrayToHEXString(macbytes);
    //let notignore = true;
    try {
      ignoreMAC.forEach((im) => {
        if (im === mac) {
          throw new Error();
        }
      });

      let databytes = receivedBytes.slice(11, 11 + 14);
      if (databytes[0] != 0xfe) {
        throw new Error();
      }
      let data = ByteArrayToHEXString(databytes);
      console.log("MAC: " + mac + " | Data: " + data);

      (async (s) => {
        console.log("[Sending]: " + s);
        targetIP.forEach((ip) => {
          sender.send(mac + data, 11111, ip, function (err) {
            if (err) {
              if (sender) {
                sender.close();
                sender = null;
              }
              sender = udp.createSocket("udp4");
            }
          });
        });
      })(receivedBytes);
    } catch (e) {
      console.log("MAC: " + mac + " is NOT from cups.");
    }
  }
}

function ByteArrayToHEXString(bytearray) {
  return Array.from(bytearray, (b) => {
    return ("0" + (b & 0xff).toString(16)).slice(-2).toUpperCase();
  }).join("");
}
