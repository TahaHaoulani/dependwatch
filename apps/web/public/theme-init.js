(function(){
  var k='dependwatch-theme';
  var t=localStorage.getItem(k);
  var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  var r=document.documentElement;
  r.classList.remove('dark','theme-light');
  r.setAttribute('data-theme',d?'dark':'light');
  if(d){r.classList.add('dark');}else{r.classList.add('theme-light');}
})();
