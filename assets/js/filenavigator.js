(function(angular) {
    "use strict";
    angular.module('FileManagerApp').service('fileNavigator', [
        '$http', 'fileManagerConfig', 'item', function ($http, fileManagerConfig, Item) {

        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

        var FileNavigator = function() {
            this.requesting = false;
            this.fileList = [];
            this.currentPath = [];
            this.IdPath = [];
            this.items = [];
            this.history = [];
            this.error = '';
            this.root = '';
            this.itemsById = []; //array of objects
            //this.names = [];
        };

        FileNavigator.prototype.currentId = function() {
             var self = this;
             return (self.IdPath.length ? self.IdPath[self.IdPath.length-1]: '');
        }

        FileNavigator.prototype.refresh = function(success, error) {
            var self = this;
            var path = self.currentPath.join('/');
            var data = {params: {
                mode: "list",
                onlyFolders: false,
                path: '/' + path,
                parent_id: self.currentId()
            }};
            //console.log(data, self.IdPath);
            self.requesting = true;
            self.fileList = [];
            self.error = '';
            $http.post(fileManagerConfig.listUrl, data).success(function(data) {
                self.fileList = [];
                angular.forEach(data.result, function(file) {
                    self.fileList.push(new Item(file, self.currentPath));
                    //console.log('file.id='+ file.id);
                    //console.log('file.parent_id='+ file.parent_id);
                    if(!self.itemsById[file.id]) {
                        self.itemsById[file.id]={};
                        self.itemsById[file.id].parent_id = file.parent_id;
                    }
                });
                //console.log('self.fileList='+self.fileList);
                //console.log('self.currentPath='+self.currentPath);
                //self.itemsById[item.model.id][parent_id] = item.model.parent_id;
                self.requesting = false;
                self.buildTree(path);

                if (data.error) {
                    self.error = data.error;
                    return typeof error === 'function' && error(data);
                }
                typeof success === 'function' && success(data);
            }).error(function(data) {
                self.requesting = false;
                typeof error === 'function' && error(data);
            });
        };

        FileNavigator.prototype.buildTree = function(path) {
            var self = this;
            function recursive(parent, file, path) {
                //console.log('parent=', parent, 'file=', file, 'path=', path);
                var absName = path ? (path + '/' + file.name) : file.name;
                if (parent.name.trim() && path.trim().indexOf(parent.name) !== 0) {
                    parent.nodes = [];
                }
                if (parent.name !== path) {
                    for (var i in parent.nodes) {
                        recursive(parent.nodes[i], file, path);
                    }
                } else {
                    for (var e in parent.nodes) {
                        if (parent.nodes[e].name === absName) {
                            return;
                        }
                    }
                    parent.nodes.push({model: file, name: absName, nodes: []});
                }
                parent.nodes = parent.nodes.sort(function(a, b) {
                    return a.name < b.name ? -1 : a.name === b.name ? 0 : 1;
                });
            };

            !self.history.length && self.history.push({name: path, nodes: []});
            for (var o in self.fileList) {
                var item = self.fileList[o];
                item.isFolder() && recursive(self.history[0], item.model, path);
            }
            console.log('self.history=',self.history);
            console.log('self.items=',self.items);
            console.log('self.itemsById=',self.itemsById);
        };

        //FileNavigator.prototype.folderClickByName = function(fullPath) {
        //    console.log('error. fix folderClickByName. for now id by name is not retrived')
        //    console.log(fullPath, self);
        //    var self = this;
        //    fullPath = fullPath.replace(/^\/*/g, '').split('/');
        //    self.currentPath = fullPath && fullPath[0] === "" ? [] : fullPath;
        //    self.refresh();
        //};

        /*returns index, not item itself*/
        FileNavigator.prototype.findItemById = function(id){
            var present = null;
            angular.forEach(self.items,function(element, index){
                if(id == item.model.id) {
                    present = index;
                }
            });
            return present;
        };

        FileNavigator.prototype.folderClick = function(item) {
            console.log('item=',item);
            var self = this;
            if (item && item.model.type === 'dir') {
                item.model.opened = !item.model.opened;
                if(!item.model.opened) {
                    //self.items.length = self.findItemById(item.model.parent_id) + 1;
                }
                self.currentPath.push(item.model.name);//must be deprecated
                var present = -1;// Is node already there?
                angular.forEach(self.IdPath,function(element, index){
                    if(element == item.model.id) {
                        present = index;
                    }
                });
                if(present > -1) {
                    //console.log('splice');
                    //self.IdPath.length = present + 1;
                    //self.items.length = present + 1;
                    //self.IdPath = self.IdPath.slice(0, present);
                }   else {
                    //console.log('push');
                    self.IdPath.push(item.model.id); // better wäre self.IdPath.push(item.model);
                    self.items.push(item);
                    //self.names[item.model.id] = item.model.name;
                }
                //removeSiblings();
                //self.IdPath.push(item.model.id);
                //console.log('self.IdPath='+self.IdPath);
                //console.log('self.items='+self.items[self.items.length-1].name);
                self.refresh();
            }
        };

        FileNavigator.prototype.upDir = function() {
            var self = this;
            if (self.currentPath[0]) {
                self.currentPath = self.currentPath.slice(0, -1);
                self.IdPath = self.IdPath.slice(0, -1);
                self.refresh();
            }
        };

        FileNavigator.prototype.goTo = function(index) {
            var self = this;
            self.currentPath = self.currentPath.slice(0, index + 1);
            self.IdPath = self.IdPath.slice(0, index + 1);
            self.refresh();
        };

        FileNavigator.prototype.chroot = function(index) {
            var self = this;
            self.root = index;
            //self.refresh();
        };

        FileNavigator.prototype.fileNameExists = function(fileName) {
            var self = this;
            for (var item in self.fileList) {
                item = self.fileList[item];
                if (fileName.trim && item.model.name.trim() === fileName.trim()) {
                    return true;
                }
            }
        };

        FileNavigator.prototype.listHasFolders = function() {
            var self = this;
            for (var item in self.fileList) {
                if (self.fileList[item].model.type === 'dir') {
                    return true;
                }
            }
        };

        return FileNavigator;
    }]);
})(angular);