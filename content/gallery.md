---
title: "Gallery"
description: ""
images: [""]
draft: false
menu: main
weight: 3 
---

   

<body>

<div style="text-align:center">
   
  <p>Click on the images below:</p>
</div>

<!-- The four columns -->
<div class="row">
  <div class="column">
    <img src="../images/binduclass.jpg" alt=" " style="width:100%" onclick="myFunction(this);">
  </div>
  <div class="column">
    <img src="../images/children circle.jpg" alt=" " style="width:100%" onclick="myFunction(this);">
  </div>
  <div class="column">
    <img src="../images/prena.jpg" alt=" " style="width:100%" onclick="myFunction(this);">
  </div>
  <div class="column">
    <img src="../images/reenaclass.jpg" alt=" " style="width:100%" onclick="myFunction(this);">
  </div>
</div>
 






<div class="container">
  <span onclick="this.parentElement.style.display='none'" class="closebtn">&times;</span>
  <img id="expandedImg" style="width:100%">
  <div id="imgtext"></div>
</div>

<script>
function myFunction(imgs) {
  var expandImg = document.getElementById("expandedImg");
  var imgText = document.getElementById("imgtext");
  expandImg.src = imgs.src;
  imgText.innerHTML = imgs.alt;
  expandImg.parentElement.style.display = "block";
}
</script>

</body>
 


 
  

  
 