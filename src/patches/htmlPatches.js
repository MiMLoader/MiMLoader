const hiddenMenu=`const renderMenu=()=>{document.body.querySelectorAll('input').forEach((element)=>{element.style.display='';element.style.userSelect='';element.style.position='';});document.body.querySelectorAll('select').forEach((element)=>{element.style.display='';element.style.userSelect='';element.style.position='';});document.body.querySelector('canvas').style.position='absolute';document.body.querySelector('canvas').style.zIndex='-1';};document.addEventListener('keydown',(event)=>{if(event.key==='h'){renderMenu();}});`;
export {
    hiddenMenu
}