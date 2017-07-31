var express=require("express");
var bodyParser=require("body-parser");
var methodOverride = require('method-override');
var mongoose=require("mongoose");

var app=express();

mongoose.connect("mongodb://localhost/coach_app");
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({extended:true}));


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


app.listen(8000, function(){
	console.log("server is up and running");
})