var http = require('http'),
    request = require('request'),
	fs = require('fs'),
	qs = require('querystring'),
	path = require('path');

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0'
	
var server = http.createServer(function(req, res) {
	if (req.url.endsWith('.css')) {
		fs.readFile('.'+req.url, function (error, pgResp) {
		if (error) {
			throw error; 
		} else {
			res.writeHead(200, { 'Content-Type': 'text/css' });
			res.write(pgResp);
			res.end();
		}});
  } else if (req.url.endsWith('.js')) {
	fs.readFile('.'+req.url, function (error, pgResp) {
	if (error) {
		throw error; 
	} else {
		res.writeHead(200, { 'Content-Type': 'text/javascript' });
		res.write(pgResp);
		res.end();
	}});
  } else if (req.url === '/favicon.ico') {
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end();
  } else if (req.url === '/getEvents') {
		var body = '';
		req.on('data', function (data) {
			body += data;
		});
		req.on('end', function () {
			var data = qs.parse(body);
			res.writeHead(200, {'Content-Type': 'text/html'});
			loadHostEvents(data.token, res);
		});
  } else if (req.url === '/randomize') {
		var body = '';
		req.on('data', function (data) {
			body += data;
		});
		req.on('end', function () {
			var data = qs.parse(body);
			submitRSVPS(data.e_id,data.uname,data.rlim,data.token,res);
		});
  } else {
	fs.readFile('.'+req.url+'.html', function (error, pgResp) {
	if (error) {
		throw error; 
	} else {
		res.write(pgResp);
		res.end();
	}});
  }
});

server.listen(server_port, server_ip_address, function () {
  console.log( "Listening on " + server_ip_address + ", port " + server_port )
});

	function getRandomInt(max) {
	  return Math.floor(Math.random() * Math.floor(max));
	}
	function loadHostEvents(token, res)
	{
		var murl = "https://api.meetup.com/members/self?access_token="+token;
		request({
			uri: murl,
			method: 'GET'
			}, function(err, response, data) {
				setupMyHostEvents(data, token, res);
			});
  }
  function setupMyHostEvents(mdata, token, res) {
		var m = JSON.parse(mdata);
		var m_id = m.id;
		var aeurl = "https://api.meetup.com/self/events?status=upcoming&only=id,name,group.urlname&access_token="+token;
		request({
			uri: aeurl,
			method: 'GET'
			}, function(err, response, data) { 
				getEventsByHosted(m_id, token, data, res); 
			}
		);
	}
	function HtmlEncode(s)
	{
	      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\[/g, '&#91;').replace(/\]/g, '&#93;').replace(/!/g, '&#33;');
	}
	function getEventsByHosted(m_id, token, aedata, res) {
		var ae = JSON.parse(aedata);
		var eventList = [];
		var cnt=0;
		ae.forEach(function(event, idx, arr) {
			if (event != null)
			{
				var e_id=event.id;
				var ename=event.name;
				var uname=event.group.urlname;
				request({
					uri: "https://api.meetup.com/"+uname+"/events/"+e_id+"/hosts?access_token="+token,
					method: 'GET',
					}, function(err, response, data) {
						if (data != null && m_id != null)
						{
							if(isEventHost(m_id, data))
							{
								eventList.push({
									id: e_id 
									, urlname : uname
									, name : HtmlEncode(ename) 
								});
							}
						}
						cnt++;
						if(arr.length === cnt) {
							res.end(JSON.stringify(eventList));
						}
					});
			}
		});
	}
	function isEventHost(m_id, hdata) {
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
	
	
	
	
	function submitRSVPS(e_id,uname,rlim,token,res) {
	//https://www.meetup.com/boardgame-oasis/events/247451690/
	var rurl = "http://api.meetup.com/"+uname+"/events/"+e_id+"/rsvps";
	var eurl = "http://api.meetup.com/"+uname+"/events/"+e_id;
	var memList = [];
	request({
		uri: rurl + "?response=yes&only=member%2Cresponse&access_token="+token,
		method: 'GET'
		}, function(err, response, rsvps) {
			var rsvp = JSON.parse(rsvps);
			var rlist = [];
			rsvp.forEach(function (rsvp) {
				if(rsvp.response == "waitlist" && rsvp.member.event_context.host != "true")
				{
					rlist[rlist.length]=rsvp.member.id;
				}
				if(err)
				{
					console.log("get rsvp list:" + err);
				}
			});
		for (i=0; i < rlim; i++) {
			var idx = getRandomInt(rlist.length);
			var m_id=rlist[idx];
			request({
					uri: 'https://api.meetup.com/2/rsvp',
					method: 'POST',
					headers: { "Authorization" : "Bearer "+token },
					data: {
						'guests' : 0 
						,'event_id' : e_id
						,'rsvp' : "yes"
						,'member_id' : m_id
					}
				}, function(err, response, rsvpedList) {
					console.log(JSON.stringify({
						'guests' : 0 
						,'event_id' : e_id
						,'rsvp' : "yes"
						,'member_id' : m_id
						,'access_token' : token
					}));
					res.writeHead(response.statusCode, {'Content-Type': 'text/html'});
					if (err && response.statusCode == 405) {
						res.end('reload');
					}
					var rsvped = JSON.parse(rsvpedList);
					console.log(rsvpedList);
					memList.push(rsvped.member.name);
					if(i === rlim-1) {
						res.end(JSON.stringify(memList));
					}
					if(err)
					{
						console.log("rsvp action:" + err);
					}
				});
			rlist.splice(idx,1);
		}
	});

  }