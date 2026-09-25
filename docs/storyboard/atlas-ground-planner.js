// Persistent SDF route follower. Search stays in AtlasField; frame work is bounded local lookahead.
(function(root) {
  const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
  function create(field,{clearance=3,lookahead=32,arrival=4,replanMs=500}={}) {
    let goal=null,route=null,cursor=1,generation=0,replans=0,lastPlan=-Infinity,invalid=false;
    let length=0,progress=0,turns=0,reason=null,lastHeading=null,prefix=[],pendingGoal=false;
    const clear=(a,b)=>!field.sweep(a,b,clearance).blocked;
    function build(from,heading,now) {
      lastPlan=now;replans++;invalid=false;pendingGoal=false;cursor=1;progress=0;length=0;
      route=field.plan(from,goal,{heading,clearanceWeight:.65,headingWeight:.3});
      if(!route || route.length<2 || route.some((p,i)=>i && !clear(route[i-1],p))) {
        route=null;reason='unreachable';return false;
      }
      prefix=[0];for(let i=1;i<route.length;i++) {length+=distance(route[i-1],route[i]);prefix.push(length);}
      reason=null;return true;
    }
    function setGoal(from,to,heading,now=0) {
      generation++;goal=to.slice();turns=0;lastHeading=heading;
      if(route && distance(route.at(-1),to)<6 && clear(route.at(-2),to)) {
        route[route.length-1]=to.slice();length=prefix.at(-2)+distance(route.at(-2),to);prefix[prefix.length-1]=length;
        reason=null;pendingGoal=false;return true;
      }
      if(now-lastPlan<replanMs) {pendingGoal=true;return Boolean(route);}
      return build(from,heading,now);
    }
    function guide(from,heading,now=0) {
      if(!goal)return {status:'idle'};
      if(pendingGoal && now-lastPlan>=replanMs)build(from,heading,now);
      if(invalid) {
        if(now-lastPlan<replanMs)return {status:'waiting'};
        build(from,heading,now);
      }
      if(!route)return {status:pendingGoal ? 'waiting' : 'unreachable'};
      const end=route[route.length-1];
      if(distance(from,end)<=arrival && clear(from,end)) {
        if(pendingGoal)return {status:'waiting'};
        progress=length;reason=field.signedDistance(...goal)<clearance ? 'projected-arrival' :
          distance(end,goal)>arrival ? 'unreachable' : 'arrived';
        return {status:reason,target:end.slice()};
      }
      // Consume only reached vertices or collision-clear shortcuts, never skip a corner by proximity alone.
      while(cursor<route.length-1 && distance(from,route[cursor])<.25 && clear(from,route[cursor+1]))cursor++;
      if(!clear(from,route[cursor])) {
        invalid=true;
        if(now-lastPlan>=replanMs) {build(from,heading,now);return guide(from,heading,now);}
        return {status:'waiting'};
      }
      let remaining=lookahead,target=route[cursor],position=from,index=cursor;
      for(let count=0;count<24 && index<route.length;count++,index++) {
        const next=route[index],leg=distance(position,next);
        const candidate=leg>remaining ? position.map((v,i)=>v+(next[i]-v)*remaining/leg) : next;
        if(!clear(from,candidate))break;
        target=candidate;if(clear(from,next))cursor=index;
        if(leg>=remaining)break;
        remaining-=leg;position=next;
      }
      // Pure pursuit gives a curved approach while the checked chord remains the collision authority.
      const a=route[cursor-1],b=route[cursor],dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
      const t=Math.max(0,Math.min(1,((from[0]-a[0])*dx+(from[1]-a[1])*dy)/(den || 1)));
      progress=Math.max(progress,Math.min(length,prefix[cursor-1]+distance(a,b)*t));
      if(lastHeading!==null)turns+=Math.abs(((heading-lastHeading+540)%360)-180)/360;
      lastHeading=heading;
      return {status:'following',target:target.slice(),goal:end.slice()};
    }
    return {setGoal,guide,invalidate(){invalid=true;},
      reset(){goal=null;route=null;cursor=1;reason=null;invalid=false;pendingGoal=false;lastPlan=-Infinity;},
      get diagnostics(){return {generation,replans,cursor,waypoints:route?.length || 0,length,progress,
        turns,reason,pendingGoal,goal:goal?.slice() || null,endpoint:route?.at(-1)?.slice() || null};}};
  }
  root.AtlasGroundPlanner={create};
})(typeof window==='undefined' ? globalThis : window);
