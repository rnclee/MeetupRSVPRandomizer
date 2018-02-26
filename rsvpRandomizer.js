var http = require('http');

http.createServer(function (req, res) {
	var body = "";
	req.on('data', function (chunk) {
		body += chunk;
	});
	res.writeHead(200, {'Content-Type': 'plain/html'});
	res.write('<!DOCTYPE html>'+
'<html>'+
'<head>'+
'<meta http-equiv="Content-Security-Policy" '+
'         content="default-src * rsvprand:; '+
'                  style-src * "self" "unsafe-inline" "unsafe-eval"; '+
'                  script-src * "self" "unsafe-inline" "unsafe-eval";">'+
'  <meta name="format-detection" content="telephone=no">'+
'  <meta name="msapplication-tap-highlight" content="no">'+
'  <meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width">'+
'  <title>Meetup RSVP Randomizer</title>'+
'  <script type="text/javascript" src="js/jquery.min.js"></script>'+
//css here '  <script type="text/javascript" src="js/jquery.min.js"></script>'+
'</head>'+
'<body>'+
'<>'+
'	function selectEvent(e_id, uname, ename){'+
'		$("#e_id").val(e_id);'+
'		$("#uname").val(uname);'+
'		$("#eventName").html("You selected the event \""+decodeURI(ename)+"\"");'+
'		$("#viewEvent").empty();'+
'	}'+
'</script>'+
'<div class="container">'+
'	<div class="main-area">'+
'		<div class="header">'+
'			<h1>Randomizer</h1>'+
'			<h3>Randomly choose your participants</h3>'+
'		</div>'+
''+
'		<div class="content">'+
'			<input type="button" id="startBtn" onclick="startApp()" value="Start">'+
''+
'			<!-- STEP 1 -->'+
'			<div id="eventDiv">'+
//'<br /><input id=\"refreshEvents\" type=\"button\" onclick=\"loadHostEvents();\" value=\"Refresh Meetups\" >'+
'				<span class="label">Select the meetup you want to use randomize RSVP on:</span>'+
'				<div id="listEvent">');
	req.on('end', function () {
		var auth = JSON.parse(body);
		var token = auth.access_token;
		loadHostEvents(token, res);
	});
    res.end();
}).listen(8080); 

	function getRandomInt(max) {
	  return Math.floor(Math.random() * Math.floor(max));
	}
  function getRSVPS(e_id, uname, rlim, token, res) {
	var respOut="":
	var rurl = "http://api.meetup.com/"+uname+"/events/"+e_id+"/rsvps";
	var eurl = "http://api.meetup.com/"+uname+"/events/"+e_id;
	$.ajax({
	url: rurl + "?response=yes&only=member%2Cresponse",
	method: 'GET',
	dataType: "html",
	success: function (data) {
		var json = JSON.parse(data);
		var rlist = [];
		json.forEach(function (rsvp) {
			if(rsvp.response == "waitlist" && rsvp.member.event_context.host != "true")
			{
				rlist[rlist.length]=rsvp.member.id;
			}
		});
		if ( rlist.length > 0 )
		{
			for (i=0; i < rlim; i++) {
				var idx = getRandomInt(rlist.length);
				var m_id=rlist[idx];
				console.log(m_id);
				$.ajax({
					url: 'https://api.meetup.com/2/rsvp/',
					method: 'POST',
					data: {
						'guests' : 0 
						,'event_id' : e_id
						,'rsvp' : "yes"
						,'member_id' : m_id
						,'access_token' : token
					},
					dataType: "html",
					success: function (data) {
						var rsvped = JSON.parse(data);
						//respOut=respOut + "$('#viewEvent').append(rsvped.member.name + ' was added to the Going list! <br \>')";
						res.write(rsvped.member.name + ' was added to the Going list! <br \>');
						
					}
				});
				rlist.splice(idx,1);
			}
		}
		else
		{
			//respOut=respOut + "$('#viewEvent').append('The waitlist is empty!')";
			res.write('The waitlist is empty!');
		}
	}
	});
  }

  function loadHostEvents(token, res)
  {
		console.log("loadHostEvents");
		var murl = "https://api.meetup.com/members/self?access_token="+token;
		$.ajax({
			url: murl,
			method: 'GET',
			dataType: "html",
			success: function (data) {
				setupMyHostEvents(data, token, res);
			}
		});
  }
  function setupMyHostEvents(mdata, token, res) {
		console.log("setupMyHostEvents");
		var m = JSON.parse(mdata);
		var m_id = m.id;
		var aeurl = "https://api.meetup.com/self/events?status=upcoming&only=id,name,group.urlname&access_token="+token;
		$.ajax({
			url: aeurl,
			method: 'GET',
			dataType: "html",
			success: function (data) { getEventsByHosted(m_id, data, token, res); }
		});
	}
	function getEventsByHosted(m_id, aedata, token, res) {
		console.log("getEventsByHosted");
		//$('#listEvent').empty();
		var ae = JSON.parse(aedata);
		ae.forEach(function(event) {
			var e_id=event.id;
			var ename=event.name;
			var uname=event.group.urlname;
			$.ajax({
				url: "https://api.meetup.com/"+uname+"/events/"+e_id+"/hosts?access_token="+token,
				method: 'GET',
				dataType: "html",
				success: function (data) {
					if(isEventHost(m_id, data))
					{
					//<a class="event-link">Let's play Puerto Rico!</a>
						//$('#listEvent').append("<a class=\"event-link\" id=\"eid_"+e_id+"\" onclick=\"selectEvent('" + e_id + "','" + uname + "','" + encodeURI(ename) + "')\" >" + ename + "</a><br>");
						res.write("<a class=\"event-link\" id=\"eid_"+e_id+"\" onclick=\"selectEvent('" + e_id + "','" + uname + "','" + encodeURI(ename) + "')\" >" + ename + "</a><br>");
					}
				}
			});
		});
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