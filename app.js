var express=require("express");
var bodyParser=require("body-parser");
var methodOverride = require('method-override');
var mongoose=require("mongoose");
var passport=require("passport");
var localStrategy=require("passport-local");
var passportLocalMongoose=require("passport-local-mongoose");
var User=require("./models/user");
var FacebookStrategy = require('passport-facebook').Strategy;

 var configAuth=require("./config/auth");


var app=express();

// session
app.use(require("express-session")({
	secret:"I am a boss", 
	resave:false,
	saveUnitialized:false}));

// passport auth stuff

// Local strategy config
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Facebook strategy config

passport.use(new FacebookStrategy({
    clientID: configAuth.facebookAuth.clientID,
    clientSecret: configAuth.facebookAuth.clientSecret,
    callbackURL: configAuth.facebookAuth.callbackURL
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate(..., function(err, user) {
      if (err) { return done(err); }
      done(null, user);
    });
  }
));

mongoose.connect("mongodb://localhost/coach_app");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({extended:true}));

// makes sure they are defined on all routes
app.use(function(req, res, next){
   res.locals.currentUser=req.user;
   next();
});


// Schema definition
var coachSchema= new mongoose.Schema({
	nom:String,
	prenom:String,
	email:String,
	description:String,
	// photo:{ data: Buffer, contentType: String },
	photo:String,
	password:String,

})

var Coach=mongoose.model("Coach", coachSchema);


// home route
app.get("/", function(req, res){
	res.render("home");
})

// Index route
app.get("/coaches", function(req, res){
	Coach.find({}, function(err, allCoaches){
		if(err){
			console.log(err);
		} else {
			res.render("coaches", {coaches:allCoaches});		
		}
	})

	
})

// new route
app.get("/coaches/nouveau", function(req, res){
	res.render("nouveau");
})

// create route (new coach)
app.post("/coaches", function(req, res){

	var coachNouveau={
		nom:req.body.nom,
		prenom:req.body.prenom,
		email:req.body.email,
		description:req.body.description,
		// photo:{ data: Buffer, contentType: String },
		photo:req.body.photo,
		password:req.body.password,
	}
		Coach.create(coachNouveau, function(err, newCoach){
		if(err){
			console.log(err);
		} else {
			console.log("new coach added to db");
			console.log(newCoach);
			res.redirect("/coaches");
		}
	})	
;})

// Show route
app.get("/coaches/:id", function(req, res){
	Coach.findById(req.params.id, function(err, foundCoach){
		if(err){
			console.log(err);
			res.redirect("/coaches");
		} else {
			res.render("show", {coach:foundCoach});
		}
	})
});

// Edit form route
app.get("/coaches/:id/edit", function(req, res){

	Coach.findById(req.params.id, function(err, foundCoach){
		if(err){
			console.log(err);
		} else {
			// render edit form
			res.render("edit", {coach:foundCoach});
		}
	})
});

// Update route
app.put("/coaches/:id", function(req, res){
	Coach.findByIdAndUpdate(req.params.id, req.body.coach, function(err, updatedCoach){
		if(err){
			console.log(err);
		} else {
			res.redirect("coaches");
		}
	})
})

// Delete route
app.delete("/coaches/:id", function(req, res){
	Coach.findByIdAndRemove(req.params.id, function(err){
		if(err){
			console.log(err);
		} else {
			res.redirect("coaches");
		}

	})
})


// Register form route
app.get("/register", function(req, res){
	res.render("register");
})

// Login form route
app.get("/login", function(req, res){
	res.render("login");
})



// =========================
//      Auth routes
// =========================


// :::::::::::::::::::::::::
//      Local Strategy
// :::::::::::::::::::::::::

// Register logic

app.post("/register", function(req, res){
	User.register(new User ({username:req.body.username}), req.body.password, function(err, user){
		if(err){
			console.log(err);
			return res.render("register");
		} else {
			passport.authenticate("local")(req, res, function(){
				res.redirect("/coaches");
			});
		}
	})
});

// Login logic

app.post("/login", passport.authenticate("local", {
	successRedirect:"/coaches",
	failureRedirect:"/login"
}))

app.listen(8000, function(){
	console.log("server is up and running");
})

// Logout logic
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


// ::::::::::::::::::::::::::::::::
//          Facebook strategy
// ::::::::::::::::::::::::::::::::

// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback
app.get('/auth/facebook', passport.authenticate('facebook'));

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { successRedirect: '/coaches',
                                      failureRedirect: '/login' }));