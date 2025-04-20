const Listing = require("../models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing you requested for does does not exist");
    res.redirect("/listings");
  }
  res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
  let response = await geocodingClient
    .forwardGeocode({
      query: req.body.listing.location,
      limit: 1,
    })
    .send();


  try {
    const listingData = {
      ...req.body.listing,
      owner: req.user._id,
      image: {
        url: req.body.listing.image.url,
        filename: "from-link",
      },
    };

    const newListing = new Listing(listingData);
    newListing.geometry=response.body.features[0].geometry;
    let savedListing= await newListing.save();
    console.log(savedListing);

    req.flash("success", "New Listing Created");
    res.redirect("/listings");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to create listing");
    res.redirect("/listings/new");
  }
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("success", "Listing you requested for does does not exist");
    res.redirect("/listings");
  }
  imageUrl = listing.image.url;
  imageUrl = imageUrl.replace("/upload", "/upload/w_250,h_160");
  res.render("listings/edit.ejs", { listing, imageUrl });
};

module.exports.updateListing = async (req, res) => {
  let { id } = req.params;

  let listing = await Listing.findByIdAndUpdate(id, {
    ...req.body.listing,
  });
  if (req.body.listing.image && req.body.listing.image.url) {
    listing.image = {
      url: req.body.listing.image.url,
      filename: "from-link",
    };
  }
  await listing.save();

  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  console.log("Deleting listing with ID:", id);

  let deletedListing = await Listing.findByIdAndDelete(id);

  if (!deletedListing) {
    throw new ExpressError(404, "Listing not found after deletion");
  }

  console.log("Deleted listing:", deletedListing);

  req.flash("success", "Listing Deleted!");

  res.redirect("/listings");
};
