use std::{env, io::{self, Read}};
use tessera_router::{route, RouteInput};

fn main() {
    let cmd=env::args().nth(1).unwrap_or_default();
    if cmd!="route" { eprintln!("usage: tessera-router route < input.json"); std::process::exit(2); }
    let mut raw=String::new(); io::stdin().read_to_string(&mut raw).expect("read stdin");
    let input:RouteInput=serde_json::from_str(&raw).expect("valid route JSON");
    println!("{}",serde_json::to_string(&route(&input)).expect("serialize"));
}
