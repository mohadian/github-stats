var paginatedData = [];
var owners_opened = [];
var owners_merged = [];
var owners_closed = [];
var prReviews = [];
var prList = [];
var repository = ""
var sizepage = 100;
var npage = 2;
var urlTemplate = "{0}/{1}/pulls?state=all&per_page={2}&page={3}&access_token={4}";

refresh = GetURLParameter("refresh");

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  modal = document.getElementById('pr_modal');

  if (event.target == modal) {
      modal.style.display = "none";
  }
}

function openNav() {
  document.getElementById("settings_menu").style.width = "250px";
  document.getElementById("main").style.marginLeft = "250px";
}

function closeNav() {
  document.getElementById("settings_menu").style.width = "0";
  document.getElementById("main").style.marginLeft= "0";
}

function closeModal(){
  document.getElementById('pr_modal').style.display = "none";
}

function openModal(){
  document.getElementById('pr_modal').style.display = "block";
}

String.prototype.format = function() {
  var str = this;
  for (var i = 0; i < arguments.length; i++) {
    var reg = new RegExp("\\{" + i + "\\}", "gm");
    str = str.replace(reg, arguments[i]);
  }
  return str;
}

Array.prototype.diff = function (a) {
    return this.filter(function (i) {
        return a.indexOf(i) === -1;
    });
};

function GetURLParameter(sParam)
{
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++)
    {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam)
        {
            return sParameterName[1];
        }
    }
}

if(refresh){
  resetData();
  getStatistics();
  //setTimeout('window.location.replace(window.location)', 20000)
} else {
  openNav();
}


function date_diff_indays(date1, date2) {
  var test=1;

  dt1 = new Date(date1);
  dt2 = new Date(date2);
  return Math.floor((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate()) ) /(1000 * 60 * 60 * 24));
}

function resetData(){
  paginatedData = [];
  owners_opened = [];
  owners_merged = [];
  owners_closed = [];
  $('#ages_merged').html("");
  $('#ages_open').html("");
  $('#approvals').html("");
  $('#reviewers').html("");
}

function getStatistics(){
  refresh = GetURLParameter("refresh");
  $("#main").LoadingOverlay("show");
  if(refresh){
    closeNav();
    repo = GetURLParameter("repo") || repository;
    npg = GetURLParameter("np") || npage;
    spages = GetURLParameter("ps") || sizepage;
    getPaginatedData(repo, npg, spages);
  } else {
    repository = $("#reporitory_name");
    ps = $("#pageSize");
    np = $("#numPages");
    resetData();
    getPaginatedData(repository.val(), np.val(), ps.val());
    closeNav();
  }
}

function getPaginatedData(repo, numPages, pageSize) {
  $('#log').html("Loading...");
  getPages(baseUrl, repo, 1, numPages, pageSize);
  $('#log').html("");
}

function getPages(baseUrl, repo, page, pageLimit, pageSize) {
  url = urlTemplate.format(baseUrl, repo, pageSize, page, accessToken);
  $.getJSON(url)
  .done(function(data) {
    paginatedData.push(data);
    if (page < pageLimit) {
      $('#log').html("Getting page " + ++page);
      getPages(baseUrl, repo, page, pageLimit, pageSize);
    } else {
      $('#log').html("");
      processData();
      $("#main").LoadingOverlay("hide", true);
    };
  });
}

function processData(){
  if($('#show_user_prs').is(':checked')) {
    getPrOwnersList();
  }
  if($('#show_prs_againg').is(':checked')) {
    processPrAges();
  }
}

function getPrOwnersList() {
  prs_owners = [];
  closedPRs = [];
  mergedPRs = [];
  openPRs = [];
  paginatedData.forEach (function(page){
    page.forEach (function(pr) {
      prs_owners.push(pr.user.login);
      if (pr.state == 'closed' && pr.merged_at != null) {
        prList.push(pr.number);
        mergedPRs.push([pr.user.login, pr.title, pr.html_url, pr.state, pr.created_at, pr.merged_at, pr.labels, pr.user.avatar_url]);
      } else if (pr.state == 'closed'){
        closedPRs.push([pr.user.login, pr.title, pr.html_url, pr.state, pr.created_at, pr.merged_at, pr.labels, pr.user.avatar_url]);
      } else {
        openPRs.push([pr.user.login, pr.title, pr.html_url, pr.state, pr.created_at, pr.merged_at, pr.labels, pr.user.avatar_url]);
      }
    });
  });

  processPrOwners(prs_owners, openPRs, mergedPRs, closedPRs);
}

function processPrAges() {
  mereged_ages = [];
  open_ages = [];
  merged = [];
  open = [];
  today = new Date();
  paginatedData.forEach (function(page){
    page.forEach (function(pr) {
      if(pr.merged_at != null){
        mereged_ages.push([date_diff_indays(pr.created_at, pr.merged_at), pr.title, pr.html_url, pr.state, pr.user.login, pr.labels, pr.user.avatar_url]);
      } else if (pr.closed_at == null && pr.merged_at == null){
        open_ages.push([date_diff_indays(pr.created_at, today), pr.title, pr.html_url, pr.state, pr.user.login, pr.labels, pr.user.avatar_url]);
      }
    });
  });

  merged = mereged_ages.reduce((p, c) => {
		  var diff = c[0];
		  if (!p.hasOwnProperty(diff)) {
          p[diff] = []
			    p[diff][0] = 0;
          p[diff][1] = [];
		  }
		  p[diff][0]++;
      p[diff][1].push(c)
		  return p;
		}, {});

  open = open_ages.reduce((p, c) => {
      var diff = c[0];
      if (!p.hasOwnProperty(diff)) {
          p[diff] = []
          p[diff][0] = 0;
          p[diff][1] = [];
      }
      p[diff][0]++;
      p[diff][1].push(c)
      return p;
		}, {});

  merged_data = [];
  merged_data_labels = [];
  merged_data_labels.push("days");
  merged_data_values = [];
  merged_data_values.push("value");
  
  open_data = [];
  open_data_labels = [];
  open_data_labels.push("days");
  open_data_values = [];
  open_data_values.push("value");

  for (var o in open){
    open_data_labels.push(o);
    open_data_values.push(open[o][0]);
  }
  open_data.push(open_data_labels, open_data_values);

  for (var o in merged){
    merged_data_labels.push(o);
    merged_data_values.push(merged[o][0]);
  }
  merged_data.push(merged_data_labels, merged_data_values);

  openPrChartData(open_ages.length, open_data);
  mergedPrChartData(mereged_ages.length, merged_data);
}

function processPrOwners(prs_owners, opened, merged, closed){
  owners = prs_owners.reduce((p, c) => {
      var name = c;
      if (!p.hasOwnProperty(name)) {
          p[name] = 0;
      }
      p[name]++;
      return p;
    }, {});

  owners_opened = opened.reduce((p, c) => {
      var diff = c[0];
      if (!p.hasOwnProperty(diff)) {
          p[diff] = []
          p[diff][0] = 0;
          p[diff][1] = [];
      }
      p[diff][0]++;
      p[diff][1].push(c)
      return p;
		}, {});
  owners_merged = merged.reduce((p, c) => {
      var diff = c[0];
      if (!p.hasOwnProperty(diff)) {
          p[diff] = []
          p[diff][0] = 0;
          p[diff][1] = [];
      }
      p[diff][0]++;
      p[diff][1].push(c)
      return p;
		}, {});
  owners_closed = closed.reduce((p, c) => {
      var diff = c[0];
      if (!p.hasOwnProperty(diff)) {
          p[diff] = []
          p[diff][0] = 0;
          p[diff][1] = [];
      }
      p[diff][0]++;
      p[diff][1].push(c)
      return p;
		}, {});

  names = []
  ownersCounts = [];
  ownersCounts[0] = [];
  ownersCounts[1] = [];
  ownersCounts[2] = [];
  ownersCounts[0].push("Open");
  ownersCounts[1].push("Merged");
	ownersCounts[2].push("Closed");

  for (var name in owners){
    found = false;
    for (var own in owners_opened) {
			if (own == name) {
        found = true;
				ownersCounts[0].push(owners_opened[own][0]);
        break;
			}
		}
    if(!found){
      ownersCounts[0].push(0);
    }
    found = false;
    for (var own in owners_merged) {
			if (own == name) {
        found = true;
				ownersCounts[1].push(owners_merged[own][0]);
        break;
			}
		}
    if(!found){
      ownersCounts[1].push(0);
    }
    found = false;
    for (var own in owners_closed) {
			if (own == name) {
        found = true;
				ownersCounts[2].push(owners_closed[own][0]);
        break;
			}
		}
    if(!found){
      ownersCounts[2].push(0);
    }
    names.push(name);
	}

  approvalChartData(names, ownersCounts);
}

function approvalChartData(names, counts) {
  var chart = c3.generate({
    bindto: '#approvals',
    data: {
    	columns: counts,
    	type: 'bar',
      onclick: function (d, i) {
        if(d.id == "Open"){
          printOwnerPrList(names, owners_opened, d);
        } else if(d.id == "Merged"){
          printOwnerPrList(names, owners_merged, d);
        } else if(d.id == "Closed"){
          printOwnerPrList(names, owners_closed, d);
        }
       },
    	},
    axis: {
        x: {
            type: 'category',
            categories: names
        }
    }
  });
  d3.select('#approvals svg').append('text')
    .attr('x', d3.select('#approvals svg').node().getBoundingClientRect().width / 2)
    .attr('y', 16)
    .attr('text-anchor', 'middle')
    .style('font-size', '1.8em')
    .text('Users PRs');
}

function openPrChartData(total, open_data) {
  var chart = c3.generate({
    bindto: '#ages_open', 
    data: {
      x: 'days',
      columns:
      open_data, 
  
      type: 'bar',
      onclick: function (d, i) {
        printOpenClosePrList(open, d);
       }
      ,
      colors: {
        value: function(d) {
          var dy = open_data[0][d.index+1];
          if(dy < 14) {
            return '#009600';
          } else if(dy < 28) {
            return '#7ecc00';
          } else if(dy<48) {
            return '#ffe600';
          } else if (dy < 96) {
            return '#f77c00';
          } else {
            return '#f70000';
          }
        }
        
      },
  
    },
    axis: {
      x: {
        type: 'category'
      }
    },
    legend: {
      show: false
    }
  });

  d3.select('#ages_open svg').append('text')
    .attr('x', d3.select('#ages_open svg').node().getBoundingClientRect().width / 2)
    .attr('y', 16)
    .attr('text-anchor', 'middle')
    .style('font-size', '1.8em')
    .text('Open Pull Requests aging (' + total+')');
}

function mergedPrChartData(total, merged_data) {
  var chart = c3.generate({
    bindto: '#ages_merged', 
    data: {
      x: 'days',
      columns:
      merged_data, 
  
      type: 'bar',
      onclick: function (d, i) {
        printOpenClosePrList(merged, d);
       }
      ,
      colors: {
        value: function(d) {
          var dy = merged_data[0][d.index+1];
          if(dy < 14) {
            return '#009600';
          } else if(dy < 28) {
            return '#7ecc00';
          } else if(dy<48) {
            return '#ffe600';
          } else if (dy < 96) {
            return '#f77c00';
          } else {
            return '#f70000';
          }
        }
      },
    },
    axis: {
      x: {
        type: 'category'
      }
    },
    legend: {
      show: false
    }
  });

  svg = d3.select('#ages_merged svg');
  d3.select('#ages_merged svg').append('text')
    .attr('x', d3.select('#ages_merged svg').node().getBoundingClientRect().width / 2)
    .attr('y', 16)
    .attr('text-anchor', 'middle')
    .style('font-size', '1.8em')
    .text('Merged Pull Requests aging(' + total+')');
}

function printOwnerPrList(names, list, item){
  i = 0;
  prs = null;
  for(o in names){
    if (i==item.index){
      prs = list[names[o]];
      break;
    }
    i++;
  }
  var htm = "<ul class='w3-ul'>";
  for (i=0; prs!=null && i<prs[1].length; i++){
    htm += "<li class='w3-bar w3-hover-green'>";
    htm += "<img src='" + prs[1][i][7] + "' class='w3-bar-item w3-circle' style='width:85px'>";
    htm += "<div class='w3-bar-item'>";
    htm += "<span class='w3-medium' style='padding: 10px;'><a href='"+prs[1][i][2]+"' target='_blank'>"+prs[1][i][1] + "</a> </span><br />";
    htm += "<span class='w3-small'>by " + prs[1][i][0] + "</span>";
      for(j=0; j<prs[1][i][6].length; j++){
        htm += ("  <span style='background-color: #{0}; padding:3px; color: #fff'>".format(prs[1][i][6][j].color)) +prs[1][i][6][j].name;
        htm += "</span>";
      }
    htm +="</div></li>";
  }
  htm += "</ul>"
  $('#pr_list').html(htm);
  openModal()
}

function printOpenClosePrList(list, item){
  i = 0;
  prs = null;
  for(li in list){
    if (i==item.index){
      prs = list[li];
      break;
    }
    i++;
  }
  //[date_diff_indays(pr.created_at, pr.merged_at), pr.title, pr.html_url, pr.state, hash(pr.user.login), pr.labels]
  var htm = "<ul class='w3-ul'>";
  for (i=0; prs!=null && i<prs[1].length; i++){
    htm += "<li class='w3-bar w3-hover-green'>";
    htm += "<img src='" + prs[1][i][6] + "' class='w3-bar-item w3-circle' style='width:85px'>";
    htm += "<div class='w3-bar-item'>";
    htm += "<span class='w3-medium' style='padding: 10px;'><a href='"+prs[1][i][2]+"' target='_blank'>"+prs[1][i][1] + "</a> </span><br />";
    htm += "<span class='w3-small'>by " + prs[1][i][4] + "</span>";
      for(j=0; j<prs[1][i][5].length; j++){
        htm += ("  <span style='background-color: #{0}; padding:3px; color: #fff'>".format(prs[1][i][5][j].color)) +prs[1][i][5][j].name;
        htm += "</span>";
      }
    htm +="</div></li>";
  }
  htm += "</ul>"
  $('#pr_list').html(htm);
  openModal();
}
