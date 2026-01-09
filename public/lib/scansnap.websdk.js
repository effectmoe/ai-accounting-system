/*!
 * scansnap JavaScript Library
 * Product: PFU LIMITED
 *
 * Copyright PFU LIMITED 2022-2023
 * Version: 1.0.3
 */

var SERVERID = "ScanSnapWebSDK";
var DEFAULTPORT = "45537";
var PORT = DEFAULTPORT;
var HOSTNAME = ((IsMacOS() && IsSafari()) ? "https" : "http") + "://localhost:"
var URLPERFIX = HOSTNAME + PORT;
var CONNECTURL = "/api/scanner/connect";
var STARTSCANURL = "/api/scanner/startscan";
var CONVERTTOBLOBURL = "/api/scanner/converttoblob/";
var CONVERTTOBASE64URL = "/api/scanner/converttobase64/";
var DISCONNECTURL = "/api/scanner/disconnect/";
var UPLOADLOGINFOTURL = "/api/scanner/uploadloginfo/";
var OnScanToFile = null;
var OnScanFinish = null;
var state = {};
var scanFilesInfo = {};
var scanningFlag = false;
/**
 * initializeFlag
 * true:初期化中/初期化済み
 * false：未初期化
 */
var initializeFlag = false;
var RequestIndex = 0;
var waitInitializeTimes = 500;
var VERSION = "1_0_3";
window["scansnap"] = {
    websdk: {},
    storage: {
        _data: {},
        setItem: function(key, value) {
            this._data[key] = value
        },
        getItem: function(key) {
            return (key in this._data) ? this._data[key] : null;
        },
        clear: function() {
            this._data = {}
        }
    },
};

/**
 * メソッド
 */
scansnap.websdk.Initialize = function Initialize () {
    var dtd = $.Deferred();

    if (!CheckOSVersion()) {
        var unsupportMessage = "Unsupported operating system version."
        console.error(unsupportMessage)
        return dtd.resolve(-3)
    }

    initializeFlag = true;
    GetSessionid().done(function(res) {
        if (res != null) {
            if(res.keyword == SERVERID){
                if(res.sessionid != null && res.sessionid.length > 0){
                    scansnap.storage.setItem("sessionid", res.sessionid);
                }else{
                    initializeFlag = false;
                }
            }
            else{
                RequestPort().done(function(res){
                    if(res == 0){
                        initializeFlag = true;
                    }else{
                        initializeFlag = false;
                    }
                    dtd.resolve(res);
                })
            }
            dtd.resolve(res.code);
        }else{
            initializeFlag = false;
            console.log("Unexpected error");
            dtd.resolve(-5);
        }
    })
    .fail(function(res) {
        const scanningMsg = "Failed to get Sessionid";
        console.log(scanningMsg);
        RequestPort().done(res=>{
            if(res == 0){
                initializeFlag = true;
            }else{
                initializeFlag = false;
            }
            dtd.resolve(res);
        });
    });
    return dtd.promise().done(function() {
        if (!initializeFlag) {
            var errorMessage = "内部サービスとの通信に失敗しました。\n以下をご確認ください。\n・ScanSnap Homeが未起動の場合は起動してください。\n・ターミナルを起動して以下のコマンドを実行し、証明書を導入してください。\nsudo /Applications/ScanSnapHomeMain.app/Contents/Helpers/ScanSnapExtension/ScanSnapWebSDKService.app/Contents/Helpers/tool -cert"
            // alert(errorMessage)
        }
    });
}

function RequestPort(){
    var dtd = $.Deferred();
    var portList = [];
    var _port = parseInt(DEFAULTPORT);
    for (let p = 1; p < 15; p++) {
        let _portData = new Promise((resolve,reject)=>{
            var newPort = (_port + p).toString();
            var newUrl = HOSTNAME + newPort;
            URLPERFIX = newUrl;
            GetSessionid().done(function(res) {
                if (res != null) {
                    if(res.keyword == SERVERID && res.code != null){
                        res.port = newPort;
                        resolve(res);
                    }else{
                        reject(null);
                    }
                }
            }).fail(function(res){
                reject(null);
            })
        })
        portList.push(_portData);
    }
    let getPortDataAll = Promise.any(portList);
    getPortDataAll.then((res) => {
        if(res.code == 0 && res.sessionid != null && res.sessionid.length > 0){
            scansnap.storage.setItem("sessionid", res.sessionid);
            PORT = res.port;
            URLPERFIX = HOSTNAME +PORT;
        }
        dtd.resolve(res.code);
    }).catch((res) => {
        dtd.resolve(-2);
    })
    return dtd.promise();
}

//スキャナーに接続し、スキャン処理を行います。
scansnap.websdk.Scan = function Scan() {
    var dtd = $.Deferred();
    if(!initializeFlag){
        console.log("Not initialized");
        dtd.resolve(-3);
    }else if (scanningFlag) {
        const scanningMsg = "Scanning, please wait";
        console.log(scanningMsg);
        dtd.resolve(-1);
    } else {
        var sessionid = scansnap.storage.getItem("sessionid");
        if (sessionid == null) {
            var timedIndex = 0;
            var waitInitialize = setInterval (function(){
                timedIndex++;
                if(sessionid != null){
                    clearInterval(waitInitialize);
                    RequestScan().done(function(res) {
                        dtd.resolve(res);
                    });
                }
                if(timedIndex == 60){
                    clearInterval(waitInitialize);
                    console.log("Wait for initialize timeout");
                    dtd.resolve(-4);
                }
            },waitInitializeTimes);
        } else {
            RequestScan().done(function(res) {
                dtd.resolve(res);
            });
        }
    }
    return dtd.promise();
};

//スキャンした画像ファイルをアップロードします。
scansnap.websdk.UploadScanImg = function UploadScanImg(imageUploadURL, filelistUploadURL , files, headerParam, fileParamArr, fileNamePrefix) {
    var dtd = $.Deferred();
    var urlList = [];
    var blobList = [];
    var _fileNameList = [];
    var needPrefix = false;
    fileNamePrefix = fileNamePrefix?.toString().slice(0,50);
    fileNamePrefix = fileNamePrefix?.replace(/[^a-zA-Z0-9\-]+/g,'');
    if (fileNamePrefix == undefined || fileNamePrefix == null || fileNamePrefix == "") {
        needPrefix = false;
    } else {
        needPrefix = true;
    }
    if (files != undefined || files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            const _fileName = scanFilesInfo[files[i]]?.fileName;
            if (_fileName == undefined || _fileName == "") {
                const msg = "file ["+files[i]+"] does not exist";
                console.log(msg);
                continue;
            }
            if (needPrefix) {
                _fileNameList.push(fileNamePrefix + "_" + _fileName);
            } else {
                _fileNameList.push(_fileName);
            }
            let _blobData = new Promise((resolve, reject) => {
                scansnap.websdk.GetBlobData(files[i]).done(res => {
                    resolve(res);
                }).fail(res=>{
                    resolve(JSON.parse(JSON.stringify(res)));
                    console.log("Failed to GetBlobData. fileID:" + files[i] + ". Detail: "+JSON.stringify(res));
                })
            })
            blobList.push(_blobData);
        }
        let getBlobDataAll = Promise.all(blobList);
        getBlobDataAll.then((res) => {
            if(res != null && res.length > 0){
                for (let r = 0; r < res.length; r++) {
                    if(res[r] instanceof ArrayBuffer){
                        var suffix = _fileNameList[r].match(/[^.]+$/)[0];
                        const _type =
                            suffix == "jpg" ? "image/jpeg" : "application/pdf";
                        var file = new File([res[r]], _fileNameList[r], {
                            type: _type,
                        });
                        var form_data = new FormData();
                        form_data.append("file", file);
                        if(fileParamArr != null && fileParamArr != undefined && r < fileParamArr.length){
                            form_data.append("extradata", JSON.stringify(fileParamArr[r]));
                        }
                        var _url = new Promise((resolve,reject)=>{
                            $.ajax({
                                headers: headerParam,
                                type: "post",
                                url: imageUploadURL,
                                data:form_data,
                                contentType:false,
                                processData:false,
                                success: function(response, status, xhr) {
                                    resolve(JSON.parse(JSON.stringify(xhr)));
                                },
                                error:function(e){
                                    resolve(JSON.parse(JSON.stringify(e)));
                                }
                            })
                        })
                    }else{
                        var _url = new Promise((resolve,reject)=>{
                            resolve(res[r]);
                        })
                    }
                    urlList.push(_url);
                }
                const uploadResult = [];
                let uploadAll = Promise.all(urlList);

                uploadAll.then((res) => {
                    console.log("Upload finished. Detail: " + JSON.stringify(res));
                    uploadResult.push.apply(uploadResult,res);
                    UploadLogInfo(JSON.stringify(uploadResult));

                    var scanFilesInfoArr = [];
                    files.forEach((key, index) => {
                        var fileInfoTemp = JSON.parse(JSON.stringify(scanFilesInfo[key]));
                        fileInfoTemp.fileName = _fileNameList[index];
                        scanFilesInfoArr.push(fileInfoTemp);
                    })
                    console.log(scanFilesInfoArr);
                    var report = new Promise((resolve,reject)=>{
                        $.ajax({
                            headers: headerParam,
                            type: "post",
                            url: filelistUploadURL,
                            data: JSON.stringify(scanFilesInfoArr),
                            contentType: "application/json",
                            processData:false,
                            success: function(response, status, xhr) {
                                resolve(JSON.parse(JSON.stringify(xhr)));
                            },
                            error:function(e){
                                resolve(JSON.parse(JSON.stringify(e)));
                            }
                        })
                    })
                    report.then((reportRes) =>{
                        //upload report Result
                        var reportInfo = {};
                        Object.assign(reportInfo, reportRes);
                        Object.assign(reportInfo, {_sskey:"report"});
                        console.log("Upload report finished. Detail: " + JSON.stringify(reportRes));
                        UploadLogInfo(JSON.stringify(reportInfo));
                        dtd.resolve(res,reportRes);
                    })
                    
                })

            }else{
                console.log("GetBlobData is null. Upload terminated");
                dtd.resolve(-1);
            }
        })
    }else{
        console.log("Parameter is empty");
        dtd.resolve(-1);
    }
    return dtd.promise();
};
//通知を受けたいイベントの登録。
scansnap.websdk.RegisterEvent = function RegisterEvent(n, f) {
    console.info("RegisterEvent start");
    if (n == "OnScanToFile") {
        OnScanToFile = f;
    } else if (n == "OnScanFinish") {
        OnScanFinish = f;
    }
};

function UploadLogInfo(msg){
    return $.ajax({
            url: URLPERFIX + UPLOADLOGINFOTURL,
            type: "POST",
            contentType: "text/plain",
            data: msg,
            beforeSend: function(XMLHttpRequest) {
                XMLHttpRequest.setRequestHeader(
                    "sessionid",
                    scansnap.storage.getItem("sessionid")
                );
            },
            success:function(res){
                console.log("UploadLogInfo succeeded");
            },
            error:function(res){
                console.log("Failed to UploadLogInfo. Detail:"+JSON.stringify(res));
            }
        });
}

function RequestScan() {
    scanningFlag = true;
    var scanFilesID = [];
    var dtd = $.Deferred();
    var ajaxScan = new Promise((resolve, reject) => {
        $.ajax({
            url: URLPERFIX + STARTSCANURL,
            type: "POST",
            contentType: "application/json; charset=utf-8",
            data: JSON.stringify(state),
            beforeSend: function(XMLHttpRequest) {
                XMLHttpRequest.setRequestHeader(
                    "sessionid",
                    scansnap.storage.getItem("sessionid")
                );
            },
            success: function(response, status, xhr) {
                resolve(JSON.parse(JSON.stringify(xhr)));
            },
            error:function(e){
                reject(JSON.parse(JSON.stringify(e)));
            }
        });
    });
    ajaxScan.then((res) => {
        const scanResult = res.responseJSON;
        if (scanResult != null && scanResult.data != null && scanResult.data.length > 0) {
            var scanResult_code = scanResult.code;
            var scanResult_data = scanResult.data;
            scanResult_data.sort(function(a,b){
                return a.id - b.id;
            });
            let idx = 0;
            let columnNum = (scanResult_data.length - 1).toString().length;
            columnNum = columnNum < 3 ? 3 : columnNum;
            scanResult_data.forEach((s) => {
                let suffixIndex = s.fileName.lastIndexOf(".");
                let fileName = s.fileName.substring(0, suffixIndex);
                let suffix = s.fileName.substring(suffixIndex);
                let splitName = fileName.split("_");
                if(splitName[1] == undefined){
                    fileName = fileName + "_" + idx.toString().padStart(columnNum, "0") + suffix;
                }else{
                    fileName = splitName[0] + "_" + idx.toString().padStart(columnNum, "0") + suffix;
                }
                Object.assign(scanFilesInfo,{[s.fileId]: {fileId: s.fileId, fileName: fileName, fileSha256: s.fileSha256, fileSize: s.fileSize}});
                scanFilesID.push(s.fileId);
                if (typeof OnScanToFile == "function") {
                    OnScanToFile(s.fileId);
                }
                idx++;
            });
            if (typeof OnScanFinish == "function") {
                OnScanFinish(scanFilesID);
            }
            dtd.resolve(scanResult_code);
        } else {
            var scanningMsg = "Abnormal scan return data";
            console.log(scanningMsg);
            dtd.resolve(scanResult.code);
        }
    }).catch((res) => {
        if(res.status == 401){
            console.log("Failed to scan. Detail: Invalid sessionid.");
            dtd.resolve(-3);
        }else if(res.status == 403){
        	console.log("Failed to scan. Detail: Unconfirmed.");
            dtd.resolve(-5);
        }else{
            console.log("Failed to scan. Detail: " + JSON.stringify(res));
            dtd.resolve(-2);
        }
       
    }).finally((res) => {
        if (res != undefined) {
            console.log("finally==>>>" + JSON.stringify(res));
        }
        scanningFlag = false;
    });
    return dtd.promise();
}

scansnap.websdk.GetBlobData = function GetBlobData(fileID) {
    return $.ajax({
        url: URLPERFIX + CONVERTTOBLOBURL + fileID,
        type: "GET",
        contentType: "application/octet-stream",
        beforeSend: function(XMLHttpRequest) {
            XMLHttpRequest.setRequestHeader(
                "sessionid",
                scansnap.storage.getItem("sessionid")
            );
        },
        xhrFields: { responseType: 'arraybuffer'},
        success: function(res) {
            console.log("GetBlobData succeeded");
        },
        error: function(res) {
            console.log("Failed to GetBlobData");
        },
    });
};
scansnap.websdk.GetBase64Data = function GetBase64Data(fileID) {
    var dtd = $.Deferred();
    var _fileName = scanFilesInfo[fileID]?.fileName;
    if (_fileName == undefined || _fileName == "") {
        const msg = "parameter format not correct";
        console.log(msg);
        dtd.reject(-1);
        return dtd.promise();
    } else {
        var suffix = _fileName.match(/[^.]+$/)[0];
        if (suffix == "pdf") {
            const msg = "Preview is not supported for PDF files";
            console.log(msg);
            dtd.reject(-2);
            return dtd.promise();
        }
    }

    $.ajax({
        url: URLPERFIX + CONVERTTOBASE64URL + fileID,
        type: "GET",
        contentType: "application/octet-stream",
        beforeSend: function(XMLHttpRequest) {
            XMLHttpRequest.setRequestHeader(
                "sessionid",
                scansnap.storage.getItem("sessionid")
            );
        },
        success: function(res) {
            console.log("GetBase64Data succeeded");
            dtd.resolve(res);
        },
        error: function(res) {
            console.log("Failed to GetBase64Data"+JSON.stringify(res));
            dtd.reject(res.status);
        },
    });
    return dtd.promise();
};


function GetSessionid() {
    return $.ajax({
        url: URLPERFIX + CONNECTURL + "/" + VERSION,
        type: "GET",
        contentType: "application/json; charset=utf-8",
        timeout:5000,
        success: function(res) {
            console.log("GetSessionid succeeded");
        },
        error: function(res) {},
    });
}

window.addEventListener("pagehide", () => {
    var _sessionid = scansnap.storage.getItem("sessionid");
    scansnap.storage.clear();
    navigator.sendBeacon(
        URLPERFIX + DISCONNECTURL + _sessionid
    );
});

// Safariであるかどうかの判断
function IsSafari() {
    // TODO: Safariは未対応（HTTPSを利用すること)
    return false
}

// MacOSであるかどうかの判断
function IsMacOS() {
    return window.navigator.userAgent.toLowerCase().indexOf("mac os x") !== -1
}

// MacOSのバージョンは10.15以降かどうかのチェック
// ※MacOS以外、また判断できない場合は、チェックOKとみなす（新しいバージョンの可能性があるので）
function CheckOSVersion() {
    if (!IsMacOS()) {
        return true
    }

    var ua = window.navigator.userAgent.toLowerCase()
    var regMacText = /mac os x.+?((\d+[\_\.])+\d+)/
    var result = regMacText.exec(ua)

    if (result == null) {
        return true
    }

    var verText = result[1]
    var verArray = []
    var regDigital = /\d+/g

    while (result = regDigital.exec(verText)) {
        verArray.push(parseInt(result[0]))
    }

    var majorVersion = verArray.shift()
    var minorVersion = verArray.shift()

    if (majorVersion === undefined || majorVersion > 10) {
        return true
    } else if (majorVersion < 10) {
        return false
    }

    if (minorVersion === undefined) {
        minorVersion = 0
    }

    if (minorVersion > 14) {
        return true
    }

    return false
}

/**
 * プロパティ
 */
Object.defineProperty(scansnap.websdk, "continueScan", {
    get: function() {
        return state.continueScan;
    },
    set: function(v) {
        state.continueScan = v;
    },
});
Object.defineProperty(scansnap.websdk, "multiFeedControl", {
    get: function() {
        return state.multiFeedControl;
    },
    set: function(v) {
        state.multiFeedControl = v;
    },
});
Object.defineProperty(scansnap.websdk, "paperProtection", {
    get: function() {
        return state.paperProtection;
    },
    set: function(v) {
        state.paperProtection = v;
    },
});
Object.defineProperty(scansnap.websdk, "paperSize", {
    get: function() {
        return state.paperSize;
    },
    set: function(v) {
        state.paperSize = v;
    },
});
Object.defineProperty(scansnap.websdk, "searchableLang", {
    get: function() {
        return state.searchableLang;
    },
    set: function(v) {
        state.searchableLang = v;
    },
});
Object.defineProperty(scansnap.websdk, "format", {
    get: function() {
        return state.format;
    },
    set: function(v) {
        state.format = v;
    },
});
Object.defineProperty(scansnap.websdk, "searchable", {
    get: function() {
        return state.searchable;
    },
    set: function(v) {
        state.searchable = v;
    },
});
Object.defineProperty(scansnap.websdk, "blankPageSkip", {
    get: function() {
        return state.blankPageSkip;
    },
    set: function(v) {
        state.blankPageSkip = v;
    },
});
Object.defineProperty(scansnap.websdk, "colorMode", {
    get: function() {
        return state.colorMode;
    },
    set: function(v) {
        state.colorMode = v;
    },
});
Object.defineProperty(scansnap.websdk, "deskew", {
    get: function() {
        return state.deskew;
    },
    set: function(v) {
        state.deskew = v;
    },
});
Object.defineProperty(scansnap.websdk, "reduceBleedThrough", {
    get: function() {
        return state.reduceBleedThrough;
    },
    set: function(v) {
        state.reduceBleedThrough = v;
    },
});
Object.defineProperty(scansnap.websdk, "rotation", {
    get: function() {
        return state.rotation;
    },
    set: function(v) {
        state.rotation = v;
    },
});
Object.defineProperty(scansnap.websdk, "scanMode", {
    get: function() {
        return state.scanMode;
    },
    set: function(v) {
        state.scanMode = v;
    },
});
Object.defineProperty(scansnap.websdk, "scanningSide", {
    get: function() {
        return state.scanningSide;
    },
    set: function(v) {
        state.scanningSide = v;
    },
});
Object.defineProperty(scansnap.websdk, "scanType", {
    get: function() {
        return state.scanType;
    },
    set: function(v) {
        state.scanType = v;
    },
});
Object.defineProperty(scansnap.websdk, "compression", {
    get: function() {
        return state.compression;
    },
    set: function(v) {
        state.compression = v;
    },
});
Object.defineProperty(scansnap.websdk, "continueScanReturnPath", {
    get: function() {
        return state.continueScanReturnPath;
    },
    set: function(v) {
        state.continueScanReturnPath = v;
    },
});
