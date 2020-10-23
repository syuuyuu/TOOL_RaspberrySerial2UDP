const SerialPort = require("serialport");
const udp = require("dgram");
const sender = udp.createSocket("udp4");




SerialPort.list().then(ports => {
  ports.forEach(port => {
    str = String(port.manufacturer);
    if(str.includes("EnOcean")) {
      console.log(port.path);
      console.log(port.manufacturer);
      const theport = new SerialPort(port.path, {baudRate: 57600});
      theport.on("open", () => {
      });
      theport.on("data", (d) => {
        console.log(d);
        if(d.byteLength > 0) {
          dealBuffer(d);
        }
      });
    }
  })
});

const MAX_BYTES_FOR_PACKET = 25;
let receivedBytes = [];
function dealBuffer(buffer) {
  if(buffer[0] == 0x55) {
    receivedBytes = [];
    for(let counti = 0; counti < MAX_BYTES_FOR_PACKET && counti < buffer.byteLength; counti++) {
      receivedBytes.push(buffer[counti]);
    }
  } else if (receivedBytes.length < MAX_BYTES_FOR_PACKET) {
    for(let counti = 0; counti < buffer.byteLength && receivedBytes.length < MAX_BYTES_FOR_PACKET; counti++) {
      receivedBytes.push(buffer[counti]);
    }
  } else {
    receivedBytes = [];
  }
  if(receivedBytes.length == MAX_BYTES_FOR_PACKET) {
    let macbytes = receivedBytes.slice(7, (7+4));
    let mac = ByteArrayToHEXString(macbytes);
    let databytes = receivedBytes.slice(11, (11+14));
    let data = ByteArrayToHEXString(databytes);    

    (async(s)=> {
       console.log("Sending:" + s);
       sender.send(mac + data, 11111, "192.168.13.86", function(err) {
         if(err) {
            sender.close();
         }
       });
    })(receivedBytes);
    console.log("MAC: " + mac + " | Data: " + data);
  }
}

function ByteArrayToHEXString(bytearray) {
    return Array.from(bytearray, (b) => {
      return ( ('0' + (b & 0xFF).toString(16)).slice(-2).toUpperCase() );
    }).join("");
}
