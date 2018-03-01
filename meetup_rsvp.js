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
		var rtn_data='{';
		console.log(JSON.stringify(ae));
		ae.forEach(function(event) {
			var e_id=event.id;
			var ename=event.name;
			var uname=event.group.urlname;
			request({
				uri: "https://api.meetup.com/"+this.uname+"/events/"+this.e_id+"/hosts?access_token="+this.token,
				method: 'GET',
				}, function(err, response, data) {
					if(isEventHost(m_id, data))
					{
						if (this.rtn_data != '{') {
							this.rtn_data = this.rtn_data + ',';
						}
						this.rtn_data = this.rtn_data + '{'+
							'id: \''+ this.e_id + '\'' +
							', event: { group : { urlname : \'' + this.uname + '\'}, name : \''+ HtmlEncode(this.ename) + '\'} }' +
						'}';
					}
				});
		});
		rtn_data = rtn_data + '}';
		console.log(rtn_data);
		res.end(rtn_data);
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