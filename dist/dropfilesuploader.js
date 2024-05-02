/*
    Dropfiles Uploader
    Version: 1.1.0
    Author: rwenzel22 https://github.com/rwenzel22
    License: MIT
*/

(function($) {
    var plugin = function(element, options) {
        var $element = $(element);
        var filesQueue = [];
        var settings = $.extend({
            url: null,
            autoProcessQueue: true,
            request: {
                method: 'POST',
                timeout: null,
                headers: null,
                customParams: null,
                withCredentials: false,
                multipleUpload: false,
                parallelUploads: 2,
            },
            droppable: true,
            paramName: 'file',
            maxFiles: null,
            maxFilesize: null,
            filesizeBase: 1000,
            acceptedFiles: null,
            debug: false,
            imageThumbnails: true,
            thumbnails: {
                width: 60,
                height: 60,
                object_fit: 'cover',
            },
            styles: {
                progressBarColor: 'rgba(245,158,11,1)',
                icons: {
                    added: null,
                    error: null,
                    success: null
                }
            },
            lang: {
                message: 'Drag or click to add files here',
                errors: {
                    maxFilesize: 'The file size is {filesize}, the maximum allowed is {maxFilesize}.',
                    acceptedFiles: 'Unsupported file extension. The file must have the extension .{fileExtension}, supported extensions are [{acceptedFiles}].',
                }
            },
            events: {
                onInit: () => {},
                onDestroy: () => {},
                onRestart: () => {},
                onFileAccepted: (fileObject) => {},
                onFileError: (fileObject) => {},
                onFileAdded: (fileObject) => {},
                onFileEnqueued: (fileObject) => {},
                onUploadSuccess: (fileObject, response, status) => {},
                onUploadError: (fileObject, response, status) => {},
                onUploadProgress: (fileObject, percentage) => {},
            }
        }, options);

        var privateFunctions = {
            debugLog: function(log) {
                if (settings.debug) {
                    console.log(log);
                }
            },
            addFile: function (file) {
                const maxFilesize = settings.maxFilesize;
                const filesizeBase = settings.filesizeBase;
                const maxSizeBytes = maxFilesize * filesizeBase * filesizeBase;
                if (
                    settings.maxFiles &&
                    filesQueue.length >= settings.maxFiles
                ) {
                    return false;
                }
                var fileStatus = 'accepted';
                var fileErrors = [];
                const fileHash = privateFunctions.createFileHash();

                if (
                    settings.maxFilesize &&
                    file.size > maxSizeBytes
                ) {
                    fileStatus = 'error';
                    fileErrors.push(privateFunctions.translateMessages('errors.maxFilesize', {filesize: privateFunctions.formatFileSize(file.size), maxFilesize: privateFunctions.formatFileSize(maxSizeBytes)}));
                }

                const acceptedFiles = settings.acceptedFiles;
                const fileExtension = file.name.split('.').pop().toLowerCase();
                if (acceptedFiles && acceptedFiles.split(',').map(ext => ext.trim()).indexOf(fileExtension) === -1) {
                    fileStatus = 'error';
                    fileErrors.push(privateFunctions.translateMessages('errors.acceptedFiles', {acceptedFiles: acceptedFiles, fileExtension: fileExtension}));
                }

                const fileObject = {
                    file: file,
                    status: fileStatus,
                    hash: fileHash,
                    errors: fileErrors
                };
                if (fileStatus === 'accepted') {
                    settings.events.onFileAccepted(fileObject);
                } else {
                    settings.events.onFileError(fileObject);
                }
                privateFunctions.debugLog({'addFile': fileObject});
                filesQueue.push(fileObject);
            },
            appendFilesToList: async function() {
                const $fileListDiv = $element.find('.df-files');
                for (let i = 0; i < filesQueue.length; i++) {
                    const fileObject = filesQueue[i];
                    if (fileObject.displayed) continue;
                    let thumbnail = '';
                    let newStatus = (fileObject.status === 'accepted' ? 'added' : 'error');
                    let statusIcon = privateFunctions.getStatusIcon(newStatus);
                    let fileCategory = privateFunctions.getFileCategory(fileObject.file.type);

                    if (settings.imageThumbnails) {
                        let thumbnailContent = '';
                        if (fileCategory.category === 'image') {
                            try {
                                content = await privateFunctions.createFileBase64(fileObject.file);
                                thumbnailContent = `<img src="${content}" alt="${fileObject.file.name}" style="object-fit:${settings.thumbnails.object_fit};">`;
                            } catch (error) {
                                thumbnailContent = fileCategory.icon;
                            }
                        } else {
                            thumbnailContent = fileCategory.icon;
                        }
                        thumbnail = `<div class="df-file-thumbnail" style="width:${settings.thumbnails.width}px; min-width:${settings.thumbnails.width}px; height:${settings.thumbnails.height}px; object-fit:${settings.thumbnails.object_fit};">${thumbnailContent}</div>`;
                    }
                    
                    const template = $('\
                        <div class="df-file">\
                            <div class="df-file-wrapper">\
                                ' + thumbnail + '\
                                <div class="df-file-data">\
                                    <div class="df-file-info">\
                                        <div class="df-file-name">\
                                            <span>\
                                            ' + fileObject.file.name + '\
                                            </span>\
                                            <small>\
                                            ' + privateFunctions.formatFileSize(fileObject.file.size) + '\
                                            </small>\
                                        </div>\
                                        <div class="df-file-status">\
                                            ' + statusIcon + '\
                                        </div>\
                                    </div>\
                                </div>\
                            </div>\
                        </div>\
                    ');
                    $fileListDiv.append(template);
                    
                    filesQueue[i].status = newStatus;
                    filesQueue[i].displayed = true;
                    filesQueue[i].$element = template;
                    settings.events.onFileAdded(filesQueue[i]);
                    privateFunctions.debugLog({'appendFileToList': filesQueue[i]});
                }

                privateFunctions.enqueueFiles();
            },
            createFileBase64: function(file) {
                return new Promise(function(resolve, reject) {
                    var fileReader = new FileReader();
            
                    fileReader.onload = function(e) {
                        var base64 = e.target.result;
            
                        resolve(base64);
                    };
            
                    fileReader.readAsDataURL(file);
                });
            },
            getStatusIcon: function(status) {
                var statusIcons = {
                    added: settings.styles.icons.added ?? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(245,158,11,1)"><path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM13 12H17V14H11V7H13V12Z"></path></svg>',
                    error: settings.styles.icons.error ?? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(239,68,68,1)"><path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z"></path></svg>',
                    success: settings.styles.icons.success ?? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="rgba(61,178,148,1)"><path d="M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z"></path></svg>',
                };
        
                return statusIcons[status] || '';
            },
            getFileCategory: function(fileType) {
                const fileCategories = {
                    'image/': { category: 'image', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15 8V4H5V20H19V8H15ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918ZM11 9.5C11 10.3284 10.3284 11 9.5 11C8.67157 11 8 10.3284 8 9.5C8 8.67157 8.67157 8 9.5 8C10.3284 8 11 8.67157 11 9.5ZM17.5 17L13.5 10L8 17H17.5Z"></path></svg>' },
                    'video/': { category: 'video', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15 4V8H19V20H5V4H15ZM3.9985 2C3.44749 2 3 2.44405 3 2.9918V21.0082C3 21.5447 3.44476 22 3.9934 22H20.0066C20.5551 22 21 21.5489 21 20.9925L20.9997 7L16 2H3.9985ZM15.0008 11.667L10.1219 8.41435C10.0562 8.37054 9.979 8.34717 9.9 8.34717C9.6791 8.34717 9.5 8.52625 9.5 8.74717V15.2524C9.5 15.3314 9.5234 15.4086 9.5672 15.4743C9.6897 15.6581 9.9381 15.7078 10.1219 15.5852L15.0008 12.3326C15.0447 12.3033 15.0824 12.2656 15.1117 12.2217C15.2343 12.0379 15.1846 11.7895 15.0008 11.667Z"></path></svg>' },
                    'audio/': { category: 'audio', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8V10H13V14.5C13 15.8807 11.8807 17 10.5 17C9.11929 17 8 15.8807 8 14.5C8 13.1193 9.11929 12 10.5 12C10.6712 12 10.8384 12.0172 11 12.05V8H15V4H5V20H19V8H16ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918Z"></path></svg>' },
                    'application/pdf': { category: 'pdf', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4H15V8H19V20H5V4ZM3.9985 2C3.44749 2 3 2.44405 3 2.9918V21.0082C3 21.5447 3.44476 22 3.9934 22H20.0066C20.5551 22 21 21.5489 21 20.9925L20.9997 7L16 2H3.9985ZM10.4999 7.5C10.4999 9.07749 10.0442 10.9373 9.27493 12.6534C8.50287 14.3757 7.46143 15.8502 6.37524 16.7191L7.55464 18.3321C10.4821 16.3804 13.7233 15.0421 16.8585 15.49L17.3162 13.5513C14.6435 12.6604 12.4999 9.98994 12.4999 7.5H10.4999ZM11.0999 13.4716C11.3673 12.8752 11.6042 12.2563 11.8037 11.6285C12.2753 12.3531 12.8553 13.0182 13.5101 13.5953C12.5283 13.7711 11.5665 14.0596 10.6352 14.4276C10.7999 14.1143 10.9551 13.7948 11.0999 13.4716Z"></path></svg>' },
                    'application/msword': { category: 'doc', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8V16H14L12 14L10 16H8V8H10V13L12 11L14 13V8H15V4H5V20H19V8H16ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918Z"></path></svg>' },
                    'application/vnd.ms-excel': { category: 'xls', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13.2 12L16 16H13.6L12 13.7143L10.4 16H8L10.8 12L8 8H10.4L12 10.2857L13.6 8H15V4H5V20H19V8H16L13.2 12ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918Z"></path></svg>' },
                    'application/vnd.ms-powerpoint': { category: 'ppt', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918ZM5 4V20H19V8H16V14H10V16H8V8H15V4H5ZM10 10V12H14V10H10Z"></path></svg>' },
                    'text/': { category: 'text', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 8V20.9932C21 21.5501 20.5552 22 20.0066 22H3.9934C3.44495 22 3 21.556 3 21.0082V2.9918C3 2.45531 3.4487 2 4.00221 2H14.9968L21 8ZM19 9H14V4H5V20H19V9ZM8 7H11V9H8V7ZM8 11H16V13H8V11ZM8 15H16V17H8V15Z"></path></svg>' },
                    'application/xml': { category: 'xml', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918ZM17.6569 12L14.1213 15.5355L12.7071 14.1213L14.8284 12L12.7071 9.87868L14.1213 8.46447L17.6569 12ZM6.34315 12L9.87868 8.46447L11.2929 9.87868L9.17157 12L11.2929 14.1213L9.87868 15.5355L6.34315 12Z"></path></svg>' },
                    'application/zip': { category: 'archive', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM19 20V4H5V20H19ZM14 12V17H10V14H12V12H14ZM12 4H14V6H12V4ZM10 6H12V8H10V6ZM12 8H14V10H12V8ZM10 10H12V12H10V10Z"></path></svg>' },
                    'application/x-rar-compressed': { category: 'archive', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM19 20V4H5V20H19ZM14 12V17H10V14H12V12H14ZM12 4H14V6H12V4ZM10 6H12V8H10V6ZM12 8H14V10H12V8ZM10 10H12V12H10V10Z"></path></svg>' },
                    'application/x-7z-compressed': { category: 'archive', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 22H4C3.44772 22 3 21.5523 3 21V3C3 2.44772 3.44772 2 4 2H20C20.5523 2 21 2.44772 21 3V21C21 21.5523 20.5523 22 20 22ZM19 20V4H5V20H19ZM14 12V17H10V14H12V12H14ZM12 4H14V6H12V4ZM10 6H12V8H10V6ZM12 8H14V10H12V8ZM10 10H12V12H10V10Z"></path></svg>' },
                    'default': { category: 'unknown', icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 8V20.9932C21 21.5501 20.5552 22 20.0066 22H3.9934C3.44495 22 3 21.556 3 21.0082V2.9918C3 2.45531 3.4487 2 4.00221 2H14.9968L21 8ZM19 9H14V4H5V20H19V9Z"></path></svg>' }
                };
        
                const categoryKeys = Object.keys(fileCategories);
                const matchedKey = categoryKeys.find(key => fileType.startsWith(key)) || 'default';
                return fileCategories[matchedKey];
            },
            createFileHash: function() {
                var timestamp = new Date().getTime();
                var random = Math.floor(Math.random() * 1000000);
                var fileHash = timestamp + random;

                return fileHash;
            },
            formatFileSize: function(sizeInBytes) {
                var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                var i = 0;
                while (sizeInBytes >= settings.filesizeBase && i < sizes.length - 1) {
                    sizeInBytes /= settings.filesizeBase;
                    i++;
                }
                return sizeInBytes.toFixed(2) + ' ' + sizes[i];
            },
            translateMessages: function(errorCode, variables) {
                let prefix = errorCode;
                let message = 'Undefined error.';
                if (errorCode.includes('.')) {
                    prefix = errorCode.split('.')[0];
                    target = errorCode.split('.')[1];
                }
                if (settings.lang[prefix] !== undefined) {
                    message = settings.lang[prefix];
                    if (typeof settings.lang[prefix] === 'object') {
                        message = settings.lang[prefix][target];
                    }
                    for (var key in variables) {
                        message = message.replace('{' + key + '}', variables[key]);
                    }
                }

                return message;
            },
            enqueueFiles: function() {
                if (settings.url) {
                    for (let i = 0; i < filesQueue.length; i++) {
                        const fileObject = filesQueue[i];
                        if (fileObject.status === 'added') {
                            const $progressBar = $(`
                                <div class="df-file-progress-container">
                                    <div class="df-file-progress-bar" style="width: 0;"></div>
                                </div>
                            `);
                            $(fileObject.$element).find('.df-file-data').append($progressBar);
                            $(fileObject.$element).find('.df-file-status').html('0%');
    
                            filesQueue[i].$progressBar = $progressBar;
                            filesQueue[i].status = 'enqueued';
                            settings.events.onFileEnqueued(filesQueue[i]);
                            privateFunctions.debugLog({'enqueueFile': filesQueue[i]});
                        }
                    }
                    
                    if (settings.autoProcessQueue) {
                        privateFunctions.proccessQueue();
                    }
                } else {
                    for (let i = 0; i < filesQueue.length; i++) {
                        const fileObject = filesQueue[i];
                        if (fileObject.status === 'added') {
                            let newStatus = (fileObject.status === 'added' ? 'success' : 'error');
                            let statusIcon = privateFunctions.getStatusIcon(newStatus);
                            const fileList = new DataTransfer();
                            fileList.items.add(fileObject.file);
                            const $inputFile = $(`<input type="file" style="display:none;" name="${settings.paramName}${(settings.maxFiles === 1 ? '' : '[]' )}">`);

                            $inputFile[0].files = fileList.files;
                            $(fileObject.$element).find('.df-file-data').append($inputFile);
                            $(fileObject.$element).find('.df-file-status').html(statusIcon);
    
                            filesQueue[i].status = newStatus;
                            settings.events.onFileEnqueued(filesQueue[i]);
                            privateFunctions.debugLog({'enqueueFile': filesQueue[i]});
                        }
                    }
                }
            },
            proccessQueue: function() {
                const multipleUpload = settings.request.multipleUpload;
                const parallelUploads = settings.request.parallelUploads;
                const enqueuedFiles = filesQueue.filter(file => file.status === 'enqueued');
                if (enqueuedFiles.length === 0) {
                    return false;
                }
                enqueuedFiles.forEach(enqueuedFile => {
                    const fileToUpdate = filesQueue.find(file => file.hash === enqueuedFile.hash);
                    if (fileToUpdate) {
                        fileToUpdate.status = 'processing';
                    }
                });
                privateFunctions.debugLog({'proccessQueue': enqueuedFiles});
                const filesToSend = [];
            
                if (!multipleUpload) {
                    for (let i = 0; i < enqueuedFiles.length; i++) {
                        filesToSend.push(enqueuedFiles[i]);
                    }
                    privateFunctions.sendRequest(filesToSend);
                } else if (parallelUploads && parallelUploads > 0) {
                    for (let i = 0; i < enqueuedFiles.length; i += parallelUploads) {
                        const chunk = enqueuedFiles.slice(i, i + parallelUploads);
                        const chunkFiles = chunk.map(item => item);
                        privateFunctions.sendRequest(chunkFiles);
                    }
                } else {
                    for (let i = 0; i < enqueuedFiles.length; i++) {
                        const file = enqueuedFiles[i];
                        privateFunctions.sendRequest([file]);
                    }
                }
            },
            sendRequest: function(files) {
                privateFunctions.debugLog({'sendRequest': files});
                var formData = new FormData();

                if (!settings.maxFiles || settings.maxFiles > 1) {
                    for (var i = 0; i < files.length; i++) {
                        formData.append(settings.paramName+'[]', files[i].file);
                    } 
                } else {
                    formData.append(settings.paramName, files.file);
                }

                var xhr = new XMLHttpRequest();

                files.forEach(function(file) {
                    file.xhr = xhr;
                });

                xhr.timeout = settings.request.timeout??0;
                xhr.withCredentials = settings.request.withCredentials;

                xhr.upload.addEventListener('progress', function(event) {
                    if (event.lengthComputable) {
                        files.forEach(function(file) {
                            if (file.status === 'processing') {
                                var percentComplete =  Math.floor((event.loaded / event.total) * 100);
                                privateFunctions.updateFileProgress(file, percentComplete);
                                settings.events.onUploadProgress(file, percentComplete);
                                privateFunctions.debugLog({'xhr_progress': [file, percentComplete]});
                            }
                        });
                    }
                });

                xhr.addEventListener('load', function() {
                    if ([200, 201, 202, 203, 204, 205, 206, 207, 208, 226].includes(xhr.status)) {
                        files.forEach(function(file) {
                            if (file.status === 'processing') {
                                file.status = 'success';
                                privateFunctions.updateFileProgress(file, 100);
                                settings.events.onUploadSuccess(file, xhr.response, xhr.status);
                            }
                        });
                    } else {
                        files.forEach(function(file) {
                            if (file.status === 'processing') {
                                file.status = 'error';
                                privateFunctions.updateFileProgress(file, 100);
                                settings.events.onUploadError(file, xhr.response, xhr.status);
                            }
                        });
                    }
                    privateFunctions.debugLog({'xhr_load': [files, xhr]});
                });

                xhr.addEventListener('timeout', function() {
                    files.forEach(function(file) {
                        if (file.status === 'processing') {
                            file.status = 'error';
                            privateFunctions.updateFileProgress(file, 100);
                            settings.events.onUploadError(file, xhr.response, xhr.status);
                        }
                    });
                    privateFunctions.debugLog({'xhr_timeout': [files, xhr]});
                });

                xhr.addEventListener('error', function() {
                    files.forEach(function(file) {
                        if (file.status === 'processing') {
                            file.status = 'error';
                            privateFunctions.updateFileProgress(file, 100);
                            settings.events.onUploadError(file, xhr.response, xhr.status);
                        }
                    });
                    privateFunctions.debugLog({'xhr_error': [files, xhr]});
                });

                xhr.addEventListener('abort', function() {
                    files.forEach(function(file) {
                        if (file.status === 'processing') {
                            file.status = 'error';
                            privateFunctions.updateFileProgress(file, 100);
                            settings.events.onUploadError(file, xhr.response, xhr.status);
                        }
                    });
                    privateFunctions.debugLog({'xhr_abort': [files, xhr]});
                });

                xhr.open(settings.request.method, settings.url, true);

                if (
                    (settings.request.headers) &&
                    (typeof settings.request.headers === 'object')
                ) {
                    for (const key in settings.request.headers) {
                        const header = settings.request.headers[key];
                        xhr.setRequestHeader(key, header);
                    }
                }

                xhr.setRequestHeader('Cache-Control', 'no-cache');

                if (
                    (settings.request.customParams) &&
                    (typeof settings.request.customParams === 'object')
                ) {
                    for (const key in settings.request.customParams) {
                        const customParamValue = settings.request.customParams[key];
                        formData.append(key, customParamValue);
                    }
                }

                xhr.send(formData);
            },
            updateFileProgress: function(file, percentage) {
                if (file.status === 'processing') {
                    file.$element.find('.df-file-status').html(percentage+'%');
                } else {
                    file.$element.find('.df-file-status').html(privateFunctions.getStatusIcon(file.status));
                }
                privateFunctions.updateRequestProgressBar(file, percentage);
            },
            updateRequestProgressBar: function(file, percentage) {
                let bgColor = '';
                if (file.status === 'processing') {
                    bgColor = settings.styles.progressBarColor;
                } else {
                    percentage = 100;
                    bgColor = (file.status === 'success' ? 'rgba(61,178,148,1)' : 'rgba(239,68,68,1)');
                }

                file.$progressBar.children().css({
                    'width': percentage + '%',
                    'background-color': bgColor
                });
            },
        };

        var methods = {
            init: function() {
                if ($element.prop('tagName').toString().toLowerCase() !== 'div') {
                    return $.error('The element is not a div tag');
                }
                const $dfContainerDiv = $(`
                    <div class="df-container">
                        <div class="df-drop-area">
                            <div class="df-message">${settings.lang.message}</div>
                        </div>
                        <div class="df-files"></div>
                    </div>
                `);
                $element.html($dfContainerDiv);
                var $dropArea = $element.find('.df-drop-area');
                $dropArea.on('click', function(e) {
                    var $fileInput = $('<input type="file" ' + (settings.maxFiles && settings.maxFiles === 1 ? '' : 'multiple') + '>');
                    $fileInput.on('change', function(e) {
                        uploadedFiles = e.target.files;
                        for (let i = 0; i < uploadedFiles.length; i++) {
                            const file = uploadedFiles[i];
                            privateFunctions.addFile(file);
                        }
        
                        privateFunctions.appendFilesToList();
                    });
                    $fileInput.click();
                });
                if (settings.droppable) {
                    $dropArea.on('dragover dragenter', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }).on('drop', function(e) {
                        e.preventDefault();
                        uploadedFiles = e.originalEvent.dataTransfer.files;
                        for (let i = 0; i < uploadedFiles.length; i++) {
                            const file = uploadedFiles[i];
                            privateFunctions.addFile(file);
                        }
        
                        privateFunctions.appendFilesToList();
                    });
                } else {
                    $dropArea.on('drop dragover dragenter', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                    });
                }

                settings.events.onInit();
                privateFunctions.debugLog('dropfilesUploader init');
            },
            destroy: function() {
                methods.abortUploads();
                methods.removeFiles();
                $element.children().remove();
                settings.events.onDestroy();
                privateFunctions.debugLog('dropfilesUploader destroy');
            },
            restart: function() {
                methods.destroy();
                methods.init();
                settings.events.onRestart();
                privateFunctions.debugLog('dropfilesUploader restart');
            },
            enqueueFiles: function() {
                privateFunctions.enqueueFiles();
                return true;
            },
            proccessQueue: function() {
                privateFunctions.proccessQueue();
                return true;
            },
            getFiles: function() {
                return filesQueue.map(function (file) {
                    return { ...file };
                });
            },
            getFile: function(hash) {
                var file = filesQueue.find(function (f) {
                    return f.hash === hash;
                });
                if (file) {
                    return { ...file };
                }
                return null;
            },
            removeFiles: function() {
                methods.abortUploads();
                filesQueue.length = 0;
                $element.find('.df-files').children().remove();
                return true;
            },
            removeFile: function(hash) {
                for (let i = 0; i < filesQueue.length; i++) {
                    if (filesQueue[i].hash === hash) {
                        filesQueue[i].xhr.abort();
                        filesQueue[i].$element.remove();
                        filesQueue.splice(i, 1);
                        break;
                    }
                }
                return true;
            },
            abortUploads: function() {
                for (let i = 0; i < filesQueue.length; i++) {
                    filesQueue[i].xhr.abort();
                }
                return true;
            },
        };

        return {
            init: methods.init,
            destroy: methods.destroy,
            restart: methods.restart,
            enqueueFiles: methods.enqueueFiles,
            proccessQueue: methods.proccessQueue,
            getFiles: methods.getFiles,
            getFile: methods.getFile,
            removeFiles: methods.removeFiles,
            removeFile: methods.removeFile,
            abortUploads: methods.abortUploads,
        };
    };

    $.fn.dropfilesUploader = function(methodOrOptions, args) {
        var pluginInstance = this.data('dropfilesUploader');
        if (typeof methodOrOptions === 'object' || !methodOrOptions) {
            if (!pluginInstance) {
                pluginInstance = new plugin(this, methodOrOptions);
                this.data('dropfilesUploader', pluginInstance);
                pluginInstance.init();
            }
            return pluginInstance;
        } else if (typeof pluginInstance[methodOrOptions] === 'function') {
            return pluginInstance[methodOrOptions].call(pluginInstance, args);
        } else {
            $.error('Method ['+methodOrOptions+'] does not exist or is not a function. Please read the documentation!');
        }
    };
})(jQuery);