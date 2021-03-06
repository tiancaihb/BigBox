var uploaders = [];
var SPLIT_PATH = "/";
var CHUNK_REMARK = "split_chunk ";
var MAX_UP_THREADS = 3;
var is_big_file = false;
var showed_split_file = {};
var locale = window.navigator.userLanguage || window.navigator.language;
if (locale) moment.locale(locale);
$(document).on("click", ".upload-to-cloud", function (e) {
    e.preventDefault();
    is_big_file = false;
    var self = $(this);
    var pk = self.data("pk");
    var dname = self.text();
    var classname = self.data("classname");
    $("#upload-loader").show();
    $("#upload-to").text(dname);
    $.ajax({
        url: "/get-up-creds",
        data: {"pk": pk},
        method: "GET",
        dataType: "json",
        success: function (data) {
            $.getScript("/static/js/" + classname + ".js", function () {
                ci_init(data, path, pk, function () {
                    $("#upload-form").show();
                    $("#upload-loader").hide();
                });
            });
        }
    });
    $("#upload-dialog").modal();
}).on("click", ".folder-link", function (e) {
    e.preventDefault();
    var folder = $(this).text();
    path += folder + "/";
    window.history.pushState(path, null, "/home" + path);
    loadFolder();
}).on("click", ".folder-link-full", function (e) {
    e.preventDefault();
    path = $(this).data('path');
    window.history.pushState(path, null, "/home" + path);
    loadFolder();
}).on("click", "tr", function (e) {
    var clicked = e.target.nodeName.toLowerCase();
    if (clicked !== "td") return;
    $(this).find("input").click();
}).on("click", "#upload-to-all", function(e){
    e.preventDefault();
    if (path !== "/") {
        $('#cant-upload-dialog').modal();
        return;
    }
    is_big_file = true;
    $("#upload-to").text("Big files");
    $("#upload-form").show();
    $("#upload-loader").hide();
    $("#upload-dialog").modal();
}).on('click', '.split_chunk', function(e) {
    $("#big-prepare-dialog").modal();
    e.preventDefault();
    var file_name = $(this).attr("file_name");
    console.log("big prepare show");
    downloadBigFile(file_name);
});

window.onpopstate = function(event) {
    path = event.state;
    loadFolder();
};
function loadFolder() {
    $('#files-op-panel').hide();
    generateDirList(path);
    $("#file_list_show").children().not("#file-list-loader").remove();
    $('#file-list-loader').show();
    var pks = [];
    $("[name='show-in-cloud']:checked").each(function (i, self) {
        pks.push($(self).val());
    });
    $.ajax({
        url: "/get-files" + path,
        method: "GET",
        data: {'pks': pks},
        traditional: true,
        dataType: "json",
        success: generateFiles,
        complete: function () {
            $('#file-list-loader').hide();
            updateLeftPanel();
        }
    });
}
$(document).ready(function () {
    history.replaceState(path, null, "/home"+path);
    $.fn.editable.defaults.mode = 'inline';
    $('#select-all').change(function () {
        var checked = $(this).prop("checked");
        $("[name='select-file']").prop("checked", checked);
        updateLeftPanel();
    });
    $('#master-progress-container').hide();
    loadFolder();
    $('#new-folder-dialog').on('hide.bs.modal', function () {
        $('#folder-name-input').val('');
        loadFolder();
    });
    $('#rename-dialog').on('show.bs.modal', function () {
        var old_name = $("[name='select-file']:checked").first().parents('tr').find('a').text();
        $('#rename-input').val(old_name);
    }).on('hide.bs.modal', function () {
        $('#rename-input').val('');
        loadFolder();
    });
    $('#upload-dialog').on('show.bs.modal', function () {
        uploaders = [];
        $('#file-input').prop('disabled', false).val('').prop('multiple', !is_big_file);
        $('#upload-add').removeClass('disabled');
        $('#upload-start').prop('disabled', true);
        $('#upload-clear').prop('disabled', true);
        $('#file-list').empty();
    }).on('hidden.bs.modal', function () {
        $('#master-progress-container').hide();
        loadFolder();
    });
    $('#share-dialog').on('show.bs.modal', function () {
        $('#recipients-group').hide();
        $('#share-form-button').prop('disabled', true).children('span').addClass('hidden');
        var sname = $("[name='select-file']:checked").first().parents('tr').find('a').text();
        var snum = $("[name='select-file']:checked").length;
        if (sname.length > 15) sname = sname.substring(0, 15) + "...";
        if (snum > 1) sname += " and " + (snum - 1) + (snum == 2 ? " other" : " others");
        $('#share-title').text(sname);
        $("[name='share-visibility']").prop('checked', false).parents('label').removeClass('active');
        $('#share-tab-1').show();
        $('#share-tab-2').hide();
        $('#share-result').text('');
        $('.editable-text').editable();
        $('#recipients').text('');
    }).on('hidden.bs.modal', function () {
        loadFolder();
    });
    $("[name='share-visibility']").on('change', function () {
        var v = $("[name='share-visibility']:checked").val();
        if (v === 'public') $('#recipients-group').hide();
        else $('#recipients-group').show();
        $('#share-form-button').prop('disabled', false);
    });
    $('#file-input').on('change', function (e) {
        e.preventDefault();
        if (is_big_file) {

            var file = e.target.files;

            $('#file-list').append('<tr><td><div class="name">' + file[0].name + '</div></td><td style="width:50%">'
                + '<div class="progress active"><div class="progress-bar progress-bar-info" style="width:0"><span>'
                + formatBytes(file[0].size) + '</span></div></div></td>'
                + '</tr>');
            $('#file-input').prop('disabled', true);
            $('#upload-add').addClass('disabled');
            // get the size to upload to each cloud

            uploaders.push(new BigUploader(file[0], $('.progress-bar').last(), acc, cloudclass));

            var size = file[0].size;

            $.ajax({
                url: '/get-acc-info',
                method: "GET",
                dataType: "json",
                complete: function(data) {
                    setupPieChart(data.responseJSON, size, acc);
                    console.log(data);
                }
            });
            $("#piechart-controls").show();

            //generate code to chow up the split file widget
        } else {
            var files = e.target.files, file;
            for (var i = 0; i < files.length; i++) {
                file = files[i];
                $('#file-list').append('<tr><td><div class="name">' + file.name + '</div></td><td style="width:50%">'
                    + '<div class="progress active"><div class="progress-bar progress-bar-info" style="width:0"><span>'
                    + formatBytes(file.size) + '</span></div></div></td>'
                    + '</tr>');
                uploaders.push(new ChunkedUploader(file, $('.progress-bar').last()));
            }
        }
        $('#file-input').val('');
        $('#upload-start').prop('disabled', uploaders.length === 0);
        $('#upload-clear').prop('disabled', uploaders.length === 0);
    });
    $('#upload-form').on('submit', function (e) {
        e.preventDefault();
        $('#file-input').prop('disabled', true);
        $('#upload-add').addClass('disabled');
        $('#upload-start').prop('disabled', true);
        $('#upload-clear').prop('disabled', true);
        if (is_big_file) {
            // read off all the percentages
            uploaders[0].one_cloud_up_size = upload_size_to_each_cloud;
            console.log(uploaders[0].one_cloud_up_size );
            uploaders[0].start();// start big file uploader
            $("#piechart-controls").hide();
            // change the code for big file upload
        } else {
            $.each(uploaders, function (i, uploader) {
                uploader.wait();
            });
            checkUpQueue();
            $('#master-progress-container').show();
            e.preventDefault();
        }
    });
    $('#new-folder-form').on('submit', function (e) {
        $('#create-folder-button').prop('disabled', true).children('span').removeClass('hidden');
        e.preventDefault();
        var pks = [];
        $.each($('.create-folder-pk'), function (i, input) {
            if ($(input).prop('checked')) pks.push($(input).val());
        });
        $.ajax({
            url: "/create-folder",
            method: "POST",
            dataType: "json",
            data: {'pk': pks, 'path': path, 'name': $('#folder-name-input').val()},
            traditional: true,
            complete: function () {
                $('#new-folder-dialog').modal('hide');
                $('#create-folder-button').prop('disabled', false).children('span').addClass('hidden');
            }
        });
    });
    $('#rename-form').on('submit', function (e) {
        $('#rename-form-button').prop('disabled', true).children('span').removeClass('hidden');
        e.preventDefault();
        var arr = [];
        $("[name='select-file']:checked").each(function (i, self) {
            $($(self).data('id')).each(function (j, me) {
                arr.push(me);
            })
        });
        $.ajax({
            url: "/rename",
            method: "POST",
            dataType: "json",
            data: {"data": JSON.stringify(arr), "to": $('#rename-input').val()},
            complete: function () {
                $('#rename-dialog').modal('hide');
                $('#rename-form-button').prop('disabled', false).children('span').addClass('hidden');
            }
        });
    });
    $('#share-form').on('submit', function (e) {
        $('#share-form-button').prop('disabled', true).children('.spinning').removeClass('hidden');
        e.preventDefault();
        var v = $("[name='share-visibility']:checked").val();
        var arr = [];
        $("[name='select-file']:checked").each(function (i, self) {
            $($(self).data('id')).each(function (j, me) {
                var k = Object.keys(me)[0];
                var d = {};
                d[k] = path + $(self).parents('tr').find('a').text();
                arr.push(d);
            })
        });
        $('#share-result').text('Sharing ...');
        $('#share-tab-1').hide();
        $('#share-tab-2').show();
        $.ajax({
            url: "/share",
            method: "POST",
            dataType: "json",
            data: {
                "id": JSON.stringify(arr),
                "name": $('#share-title').text(),
                "visibility": v,
                "recipients": $('#recipients').val(),
                "basedir": path
            },
            success: function (data) {
                $('#share-form-button').children('.spinning').addClass('hidden');
                $('#share-form-button').children('.ok').removeClass('hidden');
                if ('error' in data) {
                    $('#share-result').html('Sorry, an error happened:<br/>' + data.error);
                } else if ('link' in data) {
                    $('#share-result').html('Success!<br/>' + (v === 'public' || $('#share-email').prop('checked') === false ? 'Share this link: ' : 'Link sent to recipients by email.')
                        + '<div class="form-group"><div class="input-group"><input class="form-control" id="foo" value="' + data.link + '" readonly><span class="input-group-btn"><button class="btn form-control" data-clipboard-target="#foo" type="button" id="copy-button">Copy</button></span></div></div>');
                    new Clipboard('#copy-button');
                }
            }
        });
    });
    $('#upload-clear').on('click', function () {
        $('#upload-start').prop('disabled', true);
        $('#piechart-controls').hide();
        $('#file-input').prop('disabled', false).val('');
        $('#upload-add').removeClass('disabled');
        $('#upload-clear').prop('disabled', true);
        $('#file-list').empty();
        uploaders = [];
    });
    $('#delete-button').on('click', function (e) {
        $('#delete-button').prop('disabled', true).children('span').removeClass('hidden');
        $('#rename-button').prop('disabled', true);
        e.preventDefault();
        var arr = [];
        $("[name='select-file']:checked").each(function (i, self) {
            var v = $(self).data('id');
            if (v === -1) arr = arr.concat(showed_split_file[$(self).data('name')]);
            else {
                $($(self).data('id')).each(function (j, me) {
                    arr.push(me);
                });
            }
        });
        $.ajax({
            url: "/delete",
            method: "POST",
            dataType: "json",
            data: {"data": JSON.stringify(arr)},
            complete: function () {
                $('#delete-button').prop('disabled', false).children('span').addClass('hidden');
                $('#rename-button').prop('disabled', false);
                loadFolder();
            }
        });
    });
    $("[name='show-in-cloud']").on('change', function () {
        loadFolder();
    });
    $("#recipients")
    // don't navigate away from the field on tab when selecting an item
        .on("keydown", function (event) {
            if (event.keyCode === $.ui.keyCode.TAB &&
                $(this).autocomplete("instance").menu.active) {
                event.preventDefault();
            }
        })
        .autocomplete({
            source: function (request, response) {
                $.getJSON("/autocomplete-user", {
                    term: extractLast(request.term)
                }, response);
            },
            search: function () {
                // custom minLength
                var term = extractLast(this.value);
                if (term.length < 2) {
                    return false;
                }
            },
            focus: function () {
                // prevent value inserted on focus
                return false;
            },
            select: function (event, ui) {
                var terms = split(this.value);
                // remove the current input
                terms.pop();
                // add the selected item
                terms.push(ui.item.value);
                // add placeholder to get the comma-and-space at the end
                terms.push("");
                this.value = terms.join(", ");
                return false;
            }
        });
    $('#up-close').on('click', function(e) {
        $("#piechart-controls").hide();
    });
});

function downloadBigFile(file_name) {
   // go through all the cloud accounts and get content from each of them
    $.ajax({
        url: "/get-big-file",
        method: "GET",
        dataType: "json",
        data: {"path": "/" + file_name},
        success: function (data) {
            var file_name = data["link"];
            window.location.href = ("../static/bigfile/" + file_name);
            // the widget disappears
            $("#big-prepare-dialog").modal('hide');
        }
    });
    // after going through all the clouds, download them
}

function generateDirList(fullpath) {
    var items = fullpath.split("/");
    $("#dir_list_show").children().slice(1).remove();
    var apath = '/';
    $(items).each(function (i, item) {
        if (item === '') return;
        apath += item + '/';
        $("#dir_list_show").append(
            '<li class="breadcrumb-item">' + '<a href="#" class="folder-link-full" data-path="' + apath + '">' + item + "</a></li>"
        );
    });
}

function generateFiles(items) {
    showed_split_file = {};
    $(items).each(function (i, self) {
        var o = {};
        o[self.acc] = self.id;
        if (self.name.length>9 && self.name.substring(0, 9)=="meta data") {
            var name = self.name.substring(10);
            if (name in showed_split_file) {
                showed_split_file[name].push(o);
            } else {
                showed_split_file[name] = [o];
            }
            return;
        }
        if (self.name.length > 11 && self.name.substring(0, 11) == "split_chunk") {
            if (self.name in showed_split_file) {
                showed_split_file[self.name].push(o);
                return;
            } else {
                showed_split_file[self.name] = [o];
            }
        }
        var htmlContent = '<tr><td class="checkbox-col"><div class="checkbox checkbox-default"><input type="checkbox" name="select-file"><label></label></div></td><td class="text-xs-left" data-sort-value="';
        if (self.is_folder) {
            htmlContent += ("d");
        } else {
            htmlContent += ("f");
        }
        htmlContent += ((self.name.substring(0, 11) == "split_chunk"?self.name.substring(12):self.name).toLowerCase() + '">' + '<i class="fa fa-fw');
        if (self.is_folder) {
            htmlContent += (" fa-folder");
        } else {
            htmlContent += (" fa-file-o");
        }
        htmlContent += ('"></i> &nbsp;');

        if (self.name.substring(0, 11) == "split_chunk") {
            htmlContent += ('<a href="#"' + ' class="split_chunk" ' + '&id="' + self.id +'" file_name="'
             + self.name + '" "target="_blank">' );// if submit, then do something
            htmlContent += (self.name.substring(12) + '</a><span class="pull-right">');
        } else {
            htmlContent += ('<a href="');
            if (self.is_folder) {
                htmlContent += ('#" class="folder-link">');
            } else {
                htmlContent += ('/get-down?pk=' + self.acc + '&id=' + encodeURIComponent(self.id) + '" target="_blank">');
            }
            htmlContent += (self.name + '</a><span class="pull-right">');
        }
        // if the file is the splitted file, then have to get split chunk from each folder
        for (var j = 0; j < self.colors.length; j++) {
            htmlContent += ' <i class="color-icon" style="background-color: ';
            if (self.name.length > 11 && self.name.substring(0, 11) == "split_chunk" ) {
                htmlContent += "yellow";
            } else {
                htmlContent += self.colors[j];
            }
            htmlContent += '"></i>';
        }
        htmlContent += ("</span></td>");
        if (self.is_folder) {
            htmlContent += ('<td class="text-xs-left" data-sort-value="-1">-</td>' +
            '<td class="text-xs-left" data-sort-value="-1">-</td>');
        } else {
            htmlContent += '<td class="text-xs-left" data-sort-value="' + self.size + '">';
            if (self.name.length > 11 && self.name.substring(0, 11) == "split_chunk" ) {
                htmlContent += "";
            } else {
                htmlContent += formatBytes(self.size);
            }
            htmlContent += "</td>" + '<td class="text-xs-left" data-sort-value="'
            + new Date(self.time).getTime() + '">' + moment(self.time).format('lll') + "</td>";
        }
        htmlContent += ("</tr>");
        var tr = $(htmlContent);
        if (self.is_folder) tr.find('input').data('id', self.id);
        else {
            if (self.name.length > 11 && self.name.substring(0, 11) == "split_chunk") {
                tr.find('input').data('id', -1).data('name', self.name);
            } else {
                tr.find('input').data('id', [o]);
            }
        }
        $("#file_list_show").append(tr);
    });
    $("#th-name").stupidsort('asc');
    $("[name='select-file']").change(updateLeftPanel);
}

function updateLeftPanel () {
    var checked = $("[name='select-file']:checked");
    var numsel = checked.length;
    $('#select-all').prop("checked", (numsel === $("[name='select-file']").length));
    if (numsel === 0) {
        $('#files-op-panel').hide();
    } else {
        if (numsel === 1 && $(checked[0]).data('id') !== -1) {
            $('#num-selecting-files').text('1 item');
            $('#rename-button').prop('disabled', false);
        } else {
            $('#num-selecting-files').text(numsel + ' items');
            $('#rename-button').prop('disabled', true);
        }
        $('#files-op-panel').show();
    }
    $('#share-button').prop('disabled', false);
    $(checked).each(function (i, self) {
        if ($(self).data('id') === -1) $('#share-button').prop('disabled', true);
    });
}

function updateProgressBar(obj, completed, total, disp) {
    if (completed * 100.0 / total >= 50.0)
        obj.children('span').css('color', 'white').css('text-shadow', '1px 1px black');
    if (completed === total)
        obj.css('width', '100%').removeClass('progress-bar-info').addClass('progress-bar-success').children('span').text('Done!');
    else
        obj.css('width', completed * 100.0 / total + '%').children('span')
            .text(disp ? disp(completed) + '/' + disp(total) : completed + '/' + total);
}

function checkUpQueue() {
    var count = MAX_UP_THREADS;
    var completed = 0;
    var i;
    for (i = 0; i < uploaders.length; i++) {
        if (uploaders[i].state === 2) count--;
        if (uploaders[i].state > 2) completed++;
    }
    updateProgressBar($('#master-progress'), completed, uploaders.length);
    for (i = 0; i < uploaders.length; i++) {
        if (count === 0) break;
        if (uploaders[i].state === 1) {
            uploaders[i].start();
            count--;
        }
    }
}

String.prototype.getBytes = function () {
  var bytes = [];
  for (var i = 0; i < this.length; ++i) {
    bytes.push(this.charCodeAt(i));
  }
  return bytes;
};

function ChunkedUploader(file, progress_bar) {
    if (!this instanceof ChunkedUploader) {
        return new ChunkedUploader(file, options);
    }
    this.file = file;
    this.progress_bar = progress_bar;
    this.file_size = this.file.size;
    this.file_name = this.file.name;
    this.state = 0;
    this.path = path;
    this.chunk_size = ci_chunk_size(this.file_size);
    this.range_start = 0;
    this.range_end = this.chunk_size;
    if ('mozSlice' in this.file) this.slice_method = 'mozSlice';
    else if ('webkitSlice' in this.file) this.slice_method = 'webkitSlice';
    else this.slice_method = 'slice';
    this.upload_request = new XMLHttpRequest();
    this.upload_request.addEventListener("load", this._onChunkComplete.bind(this), false);
    this.upload_request.addEventListener("progress", this._onProgress.bind(this), false);
    this.upload_request.addEventListener("error", this._onError.bind(this), false);
}

ChunkedUploader.prototype = {
    _upload: function () {
        var chunk;
        if (this.range_end > this.file_size) {
            this.range_end = this.file_size;
        }
        chunk = this.file[this.slice_method](this.range_start, this.range_end);
        ci_prepare_chunk(this, chunk);
        this.upload_request.send(chunk);
    },
    _onProgress: function (evt) {
        var real_total = evt.loaded + this.range_start;
        this._updateProgressBar(real_total);
    },
    _updateProgressBar: function (total) {
        if (this.progress_bar != null) {
            updateProgressBar(this.progress_bar, total, this.file_size, formatBytes);
        }
    },
    _onChunkComplete: function () {
        if (this.range_end === this.file_size) {
            this._onUploadComplete();
            return;
        }
        this._updateProgressBar(this.range_end);
        this.range_start = this.range_end;
        this.range_end = this.range_start + this.chunk_size;
        this._upload();
    },
    _onUploadComplete: function () {
        ci_finish(this, this._onDone.bind(this));
    },
    _onError: function () {
        if (this.ignore_failure) {
            this._updateProgressBar(this.range_end);
            this._onChunkComplete();
            return;
        }
        this.fail('Error during upload');
    },
    _onDone: function () {
        this.state = 3;
        updateProgressBar(this.progress_bar, 1, 1);
        checkUpQueue();
    },
    wait: function () {
        this.state = 1;
        if (this.progress_bar != null) {
            this.progress_bar.children('span').text('Waiting ...');
        }
    },
    start: function () {
        this.state = 2;
        if (this.progress_bar != null) {
            this.progress_bar.children('span').text('Starting ...');
        }
        ci_start(this, this._upload.bind(this));
        this._updateProgressBar(0);
    },
    fail: function (text) {
        this.state = 4;
        if (this.progress_bar != null) {
            this.progress_bar.css('width', '0');
            this.progress_bar.children('span').text(text).css('color', 'red').css('text-shadow', '1px 1px white');
        }
        checkUpQueue();
    }
};


function BigUploader(file, progress_bar, acc, cloudclass) {

    if (!this instanceof BigUploader) {
        return new BigUploader(file, options);
    }
    this.file = file;
    this.progress_bar = progress_bar;
    this.file_size = 0; // represent total file size in the request to drive
    this.ori_file_size = this.file.size;
    this.file_name = CHUNK_REMARK + this.file.name;
    this.state = 0;
    this.path = path;

    this.chunk_size = 0;
    this.range_start = 0;
    this.range_end = this.chunk_size;
    this.cloud_info = acc;
    this.cloud_num = acc.length;
    this.finished_cloud = 0;
    this.cloudclass = cloudclass;
    this.up_range_start = 0;
    this.up_range_end = this.chunk_size;
    this.range_diff = 0;
    this.finished_size = 0;

    this.one_cloud_up_size = upload_size_to_each_cloud;
    console.log(this.one_cloud_up_size);
    this.index = 0;

    this.up_record = {};
    if ('mozSlice' in this.file) this.slice_method = 'mozSlice';
    else if ('webkitSlice' in this.file) this.slice_method = 'webkitSlice';
    else this.slice_method = 'slice';
    this.upload_request = new XMLHttpRequest();
    this.upload_request.addEventListener("load", this._onChunkComplete.bind(this), false);
    this.upload_request.addEventListener("progress", this._onProgress.bind(this), false);
    this.upload_request.addEventListener("error", this._onError.bind(this), false);
}

function getNextCloudCreds(pk, classname, done) {
    $.ajax({
        url: "/get-up-creds",
        data: {"pk": pk},
        method: "GET",
        dataType: "json",
        success: function (data) {
            $.getScript("/static/js/" + classname + ".js", function () {
                ci_init(data, "/", pk, function () {
                    done();
                });
            });
        }
    });
}

BigUploader.prototype = {
    _upload: function () {
        if (this.up_range_start == this.up_range_end) {
            this._onChunkComplete();
        }

        this.range_start = this.up_range_start - this.range_diff;// drive requires the byte start from 0, range_start, range_end is the fake data for each drive
        this.range_end = this.up_range_end - this.range_diff;

        var chunk = this.file[this.slice_method](this.up_range_start, this.up_range_end);
        ci_prepare_chunk(this, chunk);
        this.upload_request.send(chunk);

    },
    _onProgress: function (evt) {
        var real_total = evt.loaded + this.up_range_start;
        this._updateProgressBar(real_total);
    },
    _updateProgressBar: function (total) {
        updateProgressBar(this.progress_bar, total, this.ori_file_size, formatBytes);
    },
    _onChunkComplete: function () {
        if (this.up_range_end >= this.ori_file_size || this.up_range_end >= this.finished_size + this.one_cloud_up_size[this.index]) {
            this._onUploadComplete();
            return;
        }
        this._updateProgressBar(this.up_range_end);
        this.up_range_start = this.up_range_end;
        this.up_range_end = Math.min(this.finished_size + this.one_cloud_up_size[this.index], Math.min(this.up_range_start + this.chunk_size, this.ori_file_size));
        this._upload();
    },
    _onUploadComplete: function () {
        ci_finish(this, this._tmpDone.bind(this));
        this.up_record[this.cloud_info[this.finished_cloud]] = [this.up_range_start, this.up_range_end];
        this.finished_cloud += 1;
        this.finished_size += this.one_cloud_up_size[this.index];
        this.index += 1;
        this.file_size = this.one_cloud_up_size[this.index];

        if (this.finished_cloud < this.cloud_num) {
            this._updateProgressBar(this.up_range_end);
            getNextCloudCreds(this.cloud_info[this.finished_cloud], this.cloudclass[this.finished_cloud],
                function() {
                    this.chunk_size = ci_chunk_size(this.file_size);
                    ci_start(this, function() {
                        this.up_range_start = this.up_range_end;
                        this.up_range_end = Math.min(this.finished_size + this.one_cloud_up_size[this.index], Math.min(this.up_range_start + this.chunk_size, this.ori_file_size));
                        this.range_diff = this.up_range_start;
                        this._upload();
                    }.bind(this));
                }.bind(this));
        } else {
            this._onDone();
            // write upload record to file
            // connection has been closed, should reopen it again
            // reopen the last cloud
            var meta_cloud_idx = this.finished_cloud - 1;
            getNextCloudCreds(this.cloud_info[meta_cloud_idx], this.cloudclass[meta_cloud_idx],
                function() {
                    this.chunk_size = ci_chunk_size(this.file_size);
                    ci_start(this, function() {
                        var jsonse = JSON.stringify(uploaders[0].up_record);
                        var meta_file = new Blob([jsonse], {type: "application/json"});
                        meta_uploader = new MetaUploader(meta_file, uploaders[0].file_name);
                        meta_uploader.start();
                    });
                });
        }
        console.log(this.index);
    },
    _onError: function () {
        if (this.ignore_failure) {
            this._updateProgressBar(this.up_range_end);
            this._onChunkComplete();
            return;
        }
        this.fail('Error during upload');
    },
    _onDone: function () {
        this.state = 3;
        updateProgressBar(this.progress_bar, 1, 1);
    },
    _tmpDone: function () {
        console.log("one drive upload complete");
    },
    wait: function () {
        this.state = 1;
        this.progress_bar.children('span').text('Waiting ...');
    },
    start: function () {
        this.file_size = Math.min(this.one_cloud_up_size[this.index], this.ori_file_size - this.finished_cloud * this.one_cloud_up_size[this.index]);
        getNextCloudCreds(this.cloud_info[0], this.cloudclass[0], function(){
        this.chunk_size = ci_chunk_size(this.file_size);
        this.state = 2;
        ci_start(this, this._upload.bind(this));
        this._updateProgressBar(0);
        }.bind(this));
    },
    fail: function (text) {
        this.state = 4;
        this.progress_bar.css('width', '0');
        this.progress_bar.children('span').text(text).css('color', 'red').css('text-shadow', '1px 1px white');
    }
};


function MetaUploader(file, name) {

    if (!this instanceof MetaUploader) {
        return new MetaUploader(file, options);
    }
    this.file = file;
    this.progress_bar = null;
    this.file_size = this.file.size;
    this.file_name = "meta data " + name;
    this.state = 0;
    this.path = "/";
    this.chunk_size = ci_chunk_size(this.file_size);
    this.range_start = 0;
    this.range_end = this.chunk_size;
    if ('mozSlice' in this.file) this.slice_method = 'mozSlice';
    else if ('webkitSlice' in this.file) this.slice_method = 'webkitSlice';
    else this.slice_method = 'slice';
    this.upload_request = new XMLHttpRequest();
    this.upload_request.addEventListener("load", this._onChunkComplete.bind(this), false);
    this.upload_request.addEventListener("progress", this._onProgress.bind(this), false);
    this.upload_request.addEventListener("error", this._onError.bind(this), false);
}

MetaUploader.prototype = {
    _upload: function () {
        var chunk;
        if (this.range_end > this.file_size) {
            this.range_end = this.file_size;
        }
        chunk = this.file[this.slice_method](this.range_start, this.range_end);
        ci_prepare_chunk(this, chunk);
        this.upload_request.send(chunk);
    },
    _onProgress: function (evt) {
        var real_total = evt.loaded + this.range_start;
    },
    _onChunkComplete: function () {
        if (this.range_end === this.file_size) {
            this._onUploadComplete();
            return;
        }
        this.range_start = this.range_end;
        this.range_end = this.range_start + this.chunk_size;
        this._upload();
    },
    _onUploadComplete: function () {
        ci_finish(this, this._onDone.bind(this));
    },
    _onError: function () {
        if (this.ignore_failure) {
            this._onChunkComplete();
            return;
        }
        this.fail('Error during upload');
    },
    _onDone: function () {
        this.state = 3;
        checkUpQueue();
    },
    wait: function () {
        this.state = 1;
        if (this.progress_bar != null) {
            this.progress_bar.children('span').text('Waiting ...');
        }
    },
    start: function () {
        this.state = 2;
        if (this.progress_bar != null) {
            this.progress_bar.children('span').text('Starting ...');
        }
        ci_start(this, this._upload.bind(this));
    },
    fail: function (text) {
        this.state = 4;
        if (this.progress_bar != null) {
            this.progress_bar.css('width', '0');
            this.progress_bar.children('span').text(text).css('color', 'red').css('text-shadow', '1px 1px white');
        }
        checkUpQueue();
    }
};
