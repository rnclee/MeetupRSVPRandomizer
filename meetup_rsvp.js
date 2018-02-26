var http = require('http'),
    qs = require('querystring'),
    request = require('request');

var server = http.createServer(function(req, res) {
  if (req.method === 'POST' && req.url === '/getEvents') {
    var body = '';
    req.on('data', function(chunk) {
      body += chunk;
    });
    req.on('end', function() {
      var data = qs.parse(body);
      res.writeHead(200);
	  loadHostEvents(data.token, res);
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(80);


	function loadHostEvents(token, res)
	{
		var murl = "https://api.meetup.com/members/self?access_token="+token;
		request({
			uri: murl,
			method: 'GET'
			}, function(err, response, data) {
				setupMyHostEvents(data, token, res);
			}
		});
  }
  function setupMyHostEvents(mdata, token, res) {
		console.log("setupMyHostEvents");
		var m = JSON.parse(mdata);
		var m_id = m.id;
		var aeurl = "https://api.meetup.com/self/events?status=upcoming&only=id,name,group.urlname&access_token="+token;
		request({
			uri: aeurl,
			method: 'GET'
			}, function(err, response, data) { getEventsByHosted(m_id, data, token, res); }
		});
	}
	function HtmlEncode(s)
	{
	      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\[/g, '&#91;').replace(/\]/g, '&#93;').replace(/!/g, '&#33;');
	}
	function getEventsByHosted(m_id, token, aedata, res) {
		console.log("getEventsByHosted");
		var ae = JSON.parse(aedata);
		var rtn_data='{';
		ae.forEach(function(event) {
			var e_id=event.id;
			var ename=event.name;
			var uname=event.group.urlname;
			request({
				uri: "https://api.meetup.com/"+uname+"/events/"+e_id+"/hosts?access_token="+token,
				method: 'GET',
				}, function(err, response, data) {
					if(isEventHost(m_id, data))
					{
						if rtn_data != '{' {
							rtn_data = rtn_data + ',';
						}
						rtn_data = rtn_data + '{'+
							'id: \''+ e_id + '\'' +
							', event: { group : { urlname : \'' + uname + '\'}, name : \''+ HtmlEncode(ename) + '\'} }' +
						'}';
					}
				}
			});
		});
		rtn_data = rtn_data + '}';
		res.end(rtn_data);
	}
	function isEventHost(m_id, hdata) {
		console.log("isEventHost");
		var isHost = false;
		var h = JSON.parse(hdata);
		h.forEach(function (host) {
			if(host.id==m_id)
			{
				isHost=true;
			}
		});
		return isHost;
	}