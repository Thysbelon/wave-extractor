var zip = new JSZip();

const pakpicker=document.getElementById("pakpicker")
pakpicker.addEventListener('change', onChange);
function onChange(e){
	console.log("Starting on file "+e.target.files[0].name)
	const pakFile=e.target.files[0]
	const rechunkStream=pakFile.stream()
	console.log("Created readable stream")
	const streamReader=rechunkStream.getReader()
	console.log("Created reader")
	const RIFFaddresses=[]
	let addressTracker=0 // aka bytes read
	let curRIFFaddress="nothing"
	let RIFFprogress=0
	
	//from mdn
	streamReader.read().then(function processData({ done, value }) {
		// Result objects contain two properties:
		// done	- true if the stream has already given you all its data.
		// value - some data. Always undefined when done is true.
		if (done) {
			console.log("Stream complete");
			//console.log(RIFFaddresses)
			//Use RIFF addresses to extract wavs
			if (RIFFaddresses.length>0) {
				waveMaker()
			} else {
				console.warn("no WAVEs found")
			}
			//console.log("waveMaker is asynchronous")
			//para.textContent = result;
			return;
		}
	
		//charsReceived += value.length;
		//const chunk = value;
		//let listItem = document.createElement('li');
		//listItem.textContent = 'Read ' + charsReceived + ' characters so far. Current chunk = ' + chunk;
		//list2.appendChild(listItem);
	
		//result += chunk;
		
		// value is always a uint8array
		// the length of value is decided by browser automatically. Browser seems good at deciding length.
		for (let i=0, l=value.length; i<l; i++) {
			switch (RIFFprogress) {
				case 0:
					if (value[i] == 0x52) { // R
						if (curRIFFaddress==="nothing" /*do I need this check?*/) {curRIFFaddress=addressTracker+i} // if the address of the chunk is 0, and the index of the byte is 5, curRIFFaddress will be five. if the address of the chunk is 0x110, and the index of the byte is 5, curRIFFaddress will be 0x115. 
						RIFFprogress=1
					}
					break;
				case 1:
					if (value[i] == 0x49) { // I
						RIFFprogress=2
					} else {
						curRIFFaddress="nothing"
						RIFFprogress=0
					}
					break;
				case 2:
					if (value[i] == 0x46) { // F
						RIFFprogress=3
					} else {
						curRIFFaddress="nothing"
						RIFFprogress=0
					}
					break;
				case 3:
					if (value[i] == 0x46) { // F
						RIFFprogress=4
					} else {
						curRIFFaddress="nothing"
						RIFFprogress=0
					}
					break;
				case 4:
					// unknown size byte
				case 5:
					// unknown size byte
				case 6:
					// unknown size byte
				case 7:
					// unknown byte, usually 00 or 01
					RIFFprogress++
					break;
				case 8:
					if (value[i] == 0x57) { // W
						RIFFprogress=9
					} else {
						curRIFFaddress="nothing"
						RIFFprogress=0
					}
					break;
				case 9:
					if (value[i] == 0x41) { // A
						RIFFprogress=10
					} else {
						curRIFFaddress="nothing"
						RIFFprogress=0
					}
					break;
				case 10:
					if (value[i] == 0x56) { // V
						RIFFprogress=11
					} else {
						curRIFFaddress="nothing"
						RIFFprogress=0
					}
					break;
				case 11:
					if (value[i] == 0x45) { // E
						RIFFaddresses.push(curRIFFaddress)
						console.log("WAVE found at "+curRIFFaddress.toString(16).toUpperCase())
						curRIFFaddress="nothing"
						RIFFprogress=0
					} else {
						curRIFFaddress="nothing"
						RIFFprogress=0
					}
					break;
				default:
					// this should never activate
					console.log("default activated somehow")
					break;
			}
		}
		
		// reading the chunk is done, update addressTracker to the address of the next chunk
		addressTracker+=value.length
	
		// Read some more, and call this function again
		return streamReader.read().then(processData);
	});
	async function waveMaker() {
		console.log("Beginning WAVE extraction...")
		for (let address of RIFFaddresses) {
			console.log("address decimal value: "+address)
			let sizeHeaderBuffer;
			sizeHeaderBuffer=pakFile.slice(address+4, address+7);
			sizeHeaderBuffer=await sizeHeaderBuffer.arrayBuffer();
			let sizeHeaderArray=new Uint8Array(sizeHeaderBuffer);
			let curRIFFlength=sizeHeaderArray[2].toString(16).toUpperCase()+sizeHeaderArray[1].toString(16).toUpperCase()+sizeHeaderArray[0].toString(16).toUpperCase()
			console.log("for address "+address.toString(16).toUpperCase()+", curRIFFlength = "+curRIFFlength)
			curRIFFlength=parseInt(curRIFFlength, 16)
			console.log("curRIFFlength parsed as int: "+curRIFFlength)
			zip.file(address.toString(16).toUpperCase()+".wav", pakFile.slice(address, address+curRIFFlength) )
		}
		console.log("WAVE extraction complete! Zipping...")
		blob=await zip.generateAsync({type:"blob"})
		console.log("Zip complete! Saving to Downloads folder...")
		downloadBlob(blob, "ExtractedWavFiles.zip");
		console.log("Complete!")
	}
}

function downloadBlob(blob, string) {
	const link = document.createElement('a')
	const url = URL.createObjectURL(blob)
	
	link.href = url
	link.download = string
	document.body.appendChild(link)
	link.click()
	
	document.body.removeChild(link)
	window.URL.revokeObjectURL(url)
}