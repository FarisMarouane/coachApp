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
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Facebook strategy config

passport.use(new FacebookStrategy({
    clientID: configAuth.facebookAuth.clientID,
    clientSecret: configAuth.facebookAuth.clientSecret,
    callbackURL: configAuth.facebookAuth.callbackURL,
    profileFields: ["emails","name"]
  },
  function(accessToken, refreshToken, profile, done) {
    	process.nextTick(function(){
    		User.findOne({'facebook.id': profile.id}, function(err, user){
    			if(err)
    				return done(err);
    			if(user)
    				return done(null, user); 

    			else{
    				var newUser= new User();
    				newUser.facebook.id=profile.id;
    				newUser.facebook.token=accessToken;
    				newUser.facebook.name=profile.name.givenName + " " + profile.name.familyName;    			
    				newUser.facebook.email=profile.emails[0].value;
    				

    				newUser.save(function(err){
    					if(err){
    						throw err;
    					} else {
    						return done(null, newUser);
    					}
    				});
    			}   			
    		})
    	})
    }));


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
var CoachSchema = new mongoose.Schema({
	nom:String,
	prenom:String,
	email:String,
	description:String,
	author:{
	id:{
		type:mongoose.Schema.Types.ObjectId,
		ref:'User'
	}, 

	username:String
	},
	// photo:{ data: Buffer, contentType: String },
	photo:String,
	password:String,

})

var Coach=mongoose.model("Coach", CoachSchema);


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
app.get("/coaches/nouveau", isLoggedIn, function(req, res){
	res.render("nouveau");
})

// create route (new coach)
app.post("/coaches", function(req, res){

	var coachNouveau={
		nom:req.body.nom,
		prenom:req.body.prenom,
		email:req.body.email,
		description:req.body.description,
		author:{

			id:req.user._id

		},
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

	if(req.isAuthenticated()){
			Coach.findById(req.params.id, function(err, foundCoach){
				if(err){
					console.log(err);
				} else if(foundCoach.author.id == req.user._id.toString()) {

						console.log(foundCoach.author.id);
						console.log(req.user._id);
					// render edit form
					res.render("edit", {coach:foundCoach});
			} else {
				res.send("Not authorized");
				console.log(foundCoach.id);
						console.log(req.user._id);
			}
	     })

	} else {
				res.redirect("/login");
	}

	
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

	if(req.user._id.equals(currentUser.id)){
		Coach.findByIdAndRemove(req.params.id, function(err){
			if(err){
				console.log(err);
			} else {
				res.redirect("coaches");
			}

		})
	} else {
		res.send("You are not allowed for this action");
	}
	
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
		} else if(req.body.password !== req.body.passwordBis){
			console.log("The 2 passwords aren't the same");
			console.log(req.body.password);
			console.log(req.body.passwordBis);
			res.send("The 2 passwords aren't the same");

		} else if( !/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{6,12}$/.test(req.body.password) ){
				res.send("error", "Password must be: from 6 to 12 characters, at least one uppercase character, at least one lowercase character and at least one integer");
		} else {
			console.log("new user added to db :");
			console.log(user);
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
app.get('/auth/facebook', passport.authenticate('facebook', {scope:["email"]}));

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { successRedirect: '/coaches',
                                      failureRedirect: '/login' }));


// Is logged in function

function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		res.redirect("/login");
	}
}