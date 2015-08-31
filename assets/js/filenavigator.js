(function(angular) {
    "use strict";
    angular.module('FileManagerApp').service('fileNavigator', [
        '$http', 'fileManagerConfig', 'item', function ($http, fileManagerConfig, Item) {

        $http.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

        var FileNavigator = function() {
            this.requesting = false;
            this.fileList = [];
            this.currentPath = [];
            this.IdPath = [];//введено Олесем з метою замінити currentPath
            this.items = [];
            this.history = [];
            this.error = '';
            this.root = '';//Id of current root
            this.itemsById = []; //array of objects
            this.activeId ='';//actually Id of active element
            this.breadCrumbs = [];
          //this.names = [];
        };

        FileNavigator.prototype.currentId = function() {
             var self = this;
             return (self.IdPath.length ? self.IdPath[self.IdPath.length-1]: '');
        }

        FileNavigator.prototype.refresh = function(success, error) {
            console.log('refresh start');
            var self = this;
            var path = self.currentPath.join('/');
            var data = {params: {
                mode: "list",
                onlyFolders: false,
                path: '/' + path,
                parent_id: self.currentId()
            }};
            self.requesting = true;
            self.fileList = [];
            self.error = '';
            $http.post(fileManagerConfig.listUrl, data).success(function(data) {
                self.fileList = [];
                angular.forEach(data.result, function(file) {
                    self.fileList.push(new Item(file, self.currentPath));
                    if(!self.itemsById[file.id]) {//RP
                        self.itemsById[file.id]={};
                        self.itemsById[file.id].parent_id = file.parent_id;
                    }
                    if(!self.itemsById[file.parent_id]) {
                        self.itemsById[file.parent_id]={};
                        self.itemsById[file.parent_id].children = [];//Ids of children
                    }
                    self.itemsById[file.parent_id].children[file.id] = file.id;
                });
                console.log('self.fileList=',self.fileList);
                //console.log('self.itemsById=',self.itemsById);
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
            console.log('self.breadCrumbs = ', self.breadCrumbs);
            console.log('refresh return from');
        };

        FileNavigator.prototype.buildTree = function(path) {
            console.log('buildTree start');
            console.log('argument path=',path);
            var self = this;
            function recursive(parent, file, path) {
                console.log('recursive start');
                console.log('parent=', parent, 'file=', file, 'path=', path);
                //var absName = path ? (path + '/' + file.name) : file.name;
                var absName = file.name;
                console.log('absName = ', absName);
                if (parent.name.trim() && path.trim().indexOf(parent.name) !== 0) {//якщо у попереднього шляху було ім’я і воно не на початку currentPath...
                    parent.nodes = [];// ... обнулити nodes
                    console.log('nodes genullt');
                }
                if (parent.name !== path) {
                    console.log('parent.name = ',parent.name, ' but path = ', path);
                    for (var i in parent.nodes) {
                        console.log('node ', parent.nodes[i], ' goes to recursive:')
                        recursive(parent.nodes[i], file, path);
                    }
                } else {
                    console.log('parent.name = ',parent.name, ' = path = ', path);
                    for (var e in parent.nodes) {
                        console.log('node name of ', parent.nodes[e], ' will be compared with ', absName);
                        if (parent.nodes[e].name === absName) {
                            console.log('... they are equal, so return from recursive');
                            return;
                        }
                    }
                    parent.nodes.push({model: file, name: absName, nodes: []});
                    console.log('parent.nodes = ', parent.nodes);
                }
                parent.nodes = parent.nodes.sort(function(a, b) {
                    return a.name < b.name ? -1 : a.name === b.name ? 0 : 1;
                });
                console.log('parent.nodes = ', parent.nodes);
                console.log('recursive - normal return from ');
            };
            console.log('self.history=',self.history);
            !self.history.length && self.history.push({Id:self.root, model: {Id:self.root}, name: path, nodes: []});
            console.log('self.history=',self.history);
            for (var o in self.fileList) {
                var item = self.fileList[o];
                console.log('candidat for recursive: item = ',item);
                item.isFolder() && recursive(self.history[0], item.model, path);
            }
            console.log('buildTree - Return from ');
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
            console.log('folderClick start');
            console.log('item=',item);
            var self = this;
            self.breadCrumbs = [];
            self.activeId = item.model.id;
            console.log('Adding to breadcrumbs:');
            console.log('self.itemsById = ',self.itemsById)
            console.log(item);
            self.breadCrumbs.push(item);
            var parentId = self.activeId;
            while(parentId && self.itemsById[parentId] && self.itemsById[parentId].parent_id != self.root) {
                parentId = self.itemsById[parentId].parent_id;
                console.log('parentId = ', parentId);
                console.log('Adding to breadcrumbs:');
                console.log(self.itemsById[parentId]);
                self.breadCrumbs.push(self.itemsById[parentId]);
            }
            self.breadCrumbs.reverse();
            console.log('self.IdPath =', self.IdPath);
            console.log('self.currentPath =', self.currentPath);
            if (item && item.model.type === 'dir') {
                item.model.opened = !item.model.opened;
                if(!item.model.opened) {
                    //self.items.length = self.findItemById(item.model.parent_id) + 1;
                }
                //self.currentPath.push(item.model.name);//must be deprecated
                console.log('self.currentPath =', self.currentPath);
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
                    //self.IdPath.push(item.model.id); // better wäre self.IdPath.push(item.model);
                    //self.items.push(item);
                    //self.names[item.model.id] = item.model.name;
                }
                //removeSiblings();
                //self.IdPath.push(item.model.id);
                //console.log('self.IdPath='+self.IdPath);
                //console.log('library=',library);
                self.refresh();
                console.log('folderClick return from');
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