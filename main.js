
let ctx;
let layers = {};
let halftones = {
    cyan: true,
    yellow: true,
    magenta: true,
    key: true
};
let anglesList = [
{
    yellow: 0,
    cyan: 15,
    magenta: 45,
    key: 75
},
{
    yellow: 90,
    cyan: 105,
    magenta: 75,
    key: 15
},
{
    yellow: 0,
    cyan: 15,
    magenta: 75,
    key: 45
},
{
    yellow: 90,
    cyan: 165,
    magenta: 45,
    key: 105
}
];
let angles = anglesList[0];
let mode = "halftone";
let currentLayer = "original";
let cellSize = 5;

const img = new Image();
img.addEventListener('load', function () {
    changeImage(img);
}, false);
img.src = "cat.png";

function handleFiles(files) {
    layers = {};
    var reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
        changeImage(img);
    };
    reader.readAsDataURL(files[0]);
}

function changeType(type) {
    mode = type;
    changeMode();
}

function changeMode() {
    if (mode == "raster") {
        document.getElementById('raster-layer-select').classList = "field";
        document.getElementById('halftone-layer-select').classList = "field hide";
        drawRasterLayer();
    } else {
        document.getElementById('raster-layer-select').classList = "field hide";
        document.getElementById('halftone-layer-select').classList = "field";
        drawHalftone();
    }
}

function changeRasterLayer(layer) {
    currentLayer = layer;
    drawRasterLayer();
}

function changeHalftoneLayer(element) {
    halftones[element.name] = element.checked;
    drawHalftone();
}

function changeAngle(value) {
    angles = anglesList[value];
    drawHalftone();
}

function changeCellSize(value) {
    cellSize = parseInt(value);
    drawHalftone();
}

changeMode();

function changeImage(img) {
    const canvas = document.getElementById('screen');
    ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const cImg = ctx.createImageData(imageData);
    const mImg = ctx.createImageData(imageData);
    const yImg = ctx.createImageData(imageData);
    const kImg = ctx.createImageData(imageData);
    layers = {
        original: imageData,
        cyan: cImg,
        magenta: mImg,
        yellow: yImg,
        key: kImg
    };

    function putPixel(image, i, c, b) {
        image.data[i] = b & 1 ? ((1 - c) * 255) & 0xFF : 0xFF;
        image.data[i+1] = b & 2 ? ((1 - c) * 255) & 0xFF : 0xFF;
        image.data[i+2] = b & 4 ? ((1 - c) * 255) & 0xFF : 0xFF;
        image.data[i+3] = 0xFF;
    }

    for (let i = 0; i < imageData.data.length; i += 4) {
        const R = imageData.data[i] / 255;
        const G = imageData.data[i+1] / 255;
        const B = imageData.data[i+2] / 255;
        const K = 1 - Math.max(R, G, B);
        const C = (1 - K - R) / (1 - K);
        const M = (1 - K - G) / (1 - K);
        const Y = (1 - K - B) / (1 - K);
        putPixel(cImg, i, C, 1);
        putPixel(mImg, i, M, 2);
        putPixel(yImg, i, Y, 4);
        putPixel(kImg, i, K, 1 | 2 | 4);
    }

    changeMode();
}

function drawRasterLayer() {
    if (ctx) {
        ctx.putImageData(layers[currentLayer], 0, 0);
    }
}

function drawHalftone() {
    
    if (ctx === undefined || layers.key === undefined) return;
    
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.rect(0, 0, layers.key.width, layers.key.height);
    ctx.fill();

    function screening(image, coffset, color, angle) {
        const cx = image.width / 2;
        const cy = image.height / 2;
        const d = Math.max(cx, cy);
        ctx.fillStyle = color;
        for (let sy = -d*1.5; sy < d*1.5; sy += cellSize) {
            for (let sx = -d*1.5; sx < d*1.5; sx += cellSize) {
                const x = Math.floor(cx + sx * Math.cos(Math.PI * angle / 180) - sy * Math.sin(Math.PI * angle / 180));
                const y = Math.floor(cy + sx * Math.sin(Math.PI * angle / 180) + sy * Math.cos(Math.PI * angle / 180));

                if (x < 0 || x >= image.width || y < 0 || y >= image.height) {
                    continue;
                }

                function average() {
                    let sum = 0;
                    let count = 0;
                    for (let yy = 0; yy < cellSize; ++yy) {
                        for (let xx = 0; xx < cellSize; ++xx) {
                            const i = ((y+yy) * image.width + (x+xx)) * 4 + coffset;
                            if (i >= 0 && i < image.data.length) {
                                sum += 1 - image.data[i] / 255;
                                count++;
                            }
                        }
                    }
                    return sum / count;
                }

                const c = average();
                ctx.beginPath();
                ctx.arc(x + cellSize/2, y + cellSize/2, cellSize * c / 1.4, 0, 2 * Math.PI, true);
                ctx.fill();
            }
        }
    }
    
    if (halftones.yellow)  screening(layers.yellow, 2, "rgba(255, 255, 0, 0.7)", angles.yellow);
    if (halftones.cyan)    screening(layers.cyan, 0, "rgba(0, 255, 255, 0.7)", angles.cyan);
    if (halftones.magenta) screening(layers.magenta, 1, "rgba(255, 0, 255, 0.7)", angles.magenta);
    if (halftones.key)     screening(layers.key, 0, "rgba(0, 0, 0, 0.7)", angles.key);

}