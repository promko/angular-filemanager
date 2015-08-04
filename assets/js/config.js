(function(angular) {
    "use strict";
    angular.module('FileManagerApp').constant("fileManagerConfig", {
        appName: "profireader file manager",
        defaultLang: "en",

        listUrl: "list/",
        uploadUrl: "upload/",
        renameUrl: "rename/",
        copyUrl: "copy/",
        removeUrl: "remove/",
        editUrl: "edit/",
        getContentUrl: "content/",
        createFolderUrl: "createdir/",
        downloadFileUrl: "download/",
        compressUrl: "compress/",
        extractUrl: "extract/",
        permissionsUrl: "permissions/",

        allowedActions: {
            rename: true,
            copy: true,
            edit: false,
            changePermissions: false,
            compress: false,
            compressChooseName: true,
            extract: true,
            download: true,
            preview: true,
            remove: true
        },

        enablePermissionsRecursive: true,

        isEditableFilePattern: /\.(txt|html?|aspx?|ini|pl|py|md|css|js|log|htaccess|htpasswd|json|sql|xml|xslt?|sh|rb|as|bat|cmd|coffee|php[3-6]?|java|c|cbl|go|h|scala|vb)$/i,
        isImageFilePattern: /\.(jpe?g|gif|bmp|png|svg|tiff?)$/i,
        isExtractableFilePattern: /\.(gz|tar|rar|g?zip)$/i,
        tplPath: 'assets/templates'
    });
})(angular);
