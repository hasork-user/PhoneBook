var express = require("express");
var app = express();
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var expressSanitizer = require("express-sanitizer");
var methodOverride = require("method-override");
var passport = require("passport");
var localStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");


mongoose.connect("mongodb+srv://sand123:sand123@cluster0-t0jwv.gcp.mongodb.net/phonebook?retryWrites=true&w=majority", { useNewUrlParser: true });
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer()); 
app.use(methodOverride("_method"));
app.set("view engine","ejs");
app.use(express.static("public"));
mongoose.set("useFindAndModify", false);

var contactSchema = mongoose.Schema({
	name : String,
	number : String,
	email : String,
	groups : String
});
var Contact = mongoose.model("Contact", contactSchema);

var groupSchema = mongoose.Schema({
	groupname : String
});
var Group = mongoose.model("Group",groupSchema);

var userSchema = mongoose.Schema({
	username: String,
	password: String,
	contacts : [
	{
		type: mongoose.Schema.Types.ObjectId,
        ref: "Contact"
	}
	]
});
userSchema.plugin(passportLocalMongoose);
var User = mongoose.model("User",userSchema);


app.use(require("express-session")({
	secret: "This is secret btw",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	next();
});



app.get("/", function(req,res){
	res.redirect("/home");
});

app.get("/home", function(req,res){
	res.render("home");
});

app.get("/register", function(req,res){
	res.render("register");
});

app.post("/register", function(req,res){
	User.register(new User({username: req.body.username}),req.body.password,function(err,user){
		if(err){
			console.log(err);
		}else{
			passport.authenticate("local")(req,res, function(){
				res.redirect("/login")
			});
		}
	});
});

app.get("/login",function(req,res){
	res.render("login");
});

app.post("/login",passport.authenticate("local",
	{
		failureRedirect: "/login"
	}) ,function(req, res){
	res.redirect("/users/"+ req.user._id);
});

app.get("/users/:id",isLoggedIn ,function(req,res){
	User.findById(req.params.id).populate("contacts").exec(function(err,user){
			if(err){
				console.log(err);
			}else{
				res.render("phonebook",{user:user});
			}
		});
});

app.get("/users/:id/addContact",isLoggedIn,function(req,res){
	var id = req.params.id;
	Group.find({},function(err,groups){
		if(err){
			console.log(err);
		}else{
			res.render("addContact",{groups:groups,id:id});
		}
	});
});

app.post("/users/:id/addContact",isLoggedIn,function(req,res){
	var id = req.params.id;
	req.body.contact.body = req.sanitize(req.body.contact.body);

	User.findById(id,function(err,user){
		if(err){
			console.log(err);
		}else{
		Contact.create(req.body.contact,function(err,contact){
		if(err){
			console.log(err);
		}else{
			user.contacts.push(contact);
			user.save();
			res.redirect("/users/"+id);
		}
	});
		}
	});

});

app.get("/users/:id/addContact/addGroup",isLoggedIn,function(req,res){
	var id = req.params.id;
	var url = "/users/"+id+"/addContact/addGroup"
	res.render("addGroup",{url:url});
});
app.get("/users/:userid/edit/:contactid/addGroup",isLoggedIn,function(req,res){
	var userid = req.params.userid;
	var contactid = req.params.contactid;
	var url = "/users/"+userid+"/edit/"+contactid+"/addGroup"
	res.render("addGroup",{url});
});

app.post("/users/:userid/addContact/addGroup",isLoggedIn,function(req,res){
	var userid = req.params.userid;
	var groupname = req.body.groupname;
	Group.create({groupname:groupname},function(err,groups){
		if(err){
			console.log(err);
		}else{
		res.redirect("/users/"+userid+"/addContact");
	}
	});
});
app.post("/users/:userid/edit/:contactid/addGroup",isLoggedIn,function(req,res){
	var userid = req.params.userid;
	var contactid = req.params.contactid
	var groupname = req.body.groupname;
	Group.create({groupname:groupname},function(err,groups){
		if(err){
			console.log(err);
		}else{
		res.redirect("/users/"+userid+"/edit/"+contactid);
	}
	});
});

app.get("/users/:userid/edit/:contactid",isLoggedIn,function(req,res){
	var userid = req.params.userid;
	var contactid = req.params.contactid;
	User.findById(userid)
		.populate("contacts")
		.exec(function(err,user){
			if(err){
				console.log(err);
			}else{
				Contact.findById(contactid,function(err,contact){
							if(err){
								console.log(err);
							}else{
								Group.find({},function(err,groups){
									if(err){
										console.log(err);
									}else{
										res.render("edit",{userid:userid,contactid:contactid,contact:contact,groups:groups});
									}
								});
							}
						});
			}
		});
});

app.put("/users/:userid/edit/:contactid",isLoggedIn,function(req,res){
	req.body.contact.body = req.sanitize(req.body.contact.body);
	Contact.findByIdAndUpdate(req.params.contactid,req.body.contact,function(err,updatedContact){
		if(err){
			console.log(err);
		}else{
			res.redirect("/users/"+req.params.userid);
		}
	});
});

app.delete("/users/:userid/delete/:contactid",isLoggedIn,function(req,res){
	Contact.findByIdAndRemove(req.params.contactid,function(err){
		if(err){
			console.log(err);
		}else{
			res.redirect("/users/"+req.params.userid);
		}
	});
});

app.get("/logout",function(req,res){
	req.logout();
	res.redirect("/home");
});


function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	res.redirect("/login");
}


app.listen(process.env.PORT,process.env.IP,function(){
	console.log("Started!");
});